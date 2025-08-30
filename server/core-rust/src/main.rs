use anyhow::{anyhow, Result};
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio_stream::wrappers::ReceiverStream;
use tonic::{transport::Server, Request, Response, Status};
use tonic_reflection::server::Builder as ReflectionBuilder;
use tracing::{error, info, warn};

use chrono::Utc;
use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use url::Url;

use data::{
  candles::store::{CandleStore, CandleStoreConfig},
  market_data::{MarketDataService, WsRequest, WsTopics},
};

pub mod generated {
  tonic::include_proto!("core");
}

use generated::trading_core_server::{TradingCore, TradingCoreServer};
use generated::*;

#[derive(Debug, Clone)]
struct MarketData {
  mid_price: f64,
  bid_price: f64,
  ask_price: f64,
  spread: f64,
  volume_24h: f64,
  price_change_24h: f64,
}

impl Default for MarketData {
  fn default() -> Self {
    Self {
      mid_price: 0.0,
      bid_price: 0.0,
      ask_price: 0.0,
      spread: 0.0,
      volume_24h: 0.0,
      price_change_24h: 0.0,
    }
  }
}

#[derive(Debug, Clone)]
struct EngineState {
  markets: std::collections::HashMap<String, MarketData>,
  state: String,
  heartbeat_counter: u64,
}

impl Default for EngineState {
  fn default() -> Self {
    let mut markets = std::collections::HashMap::new();
    markets.insert("15".to_string(), MarketData::default()); // BTC
    markets.insert("16".to_string(), MarketData::default()); // ETH
    markets.insert("14".to_string(), MarketData::default()); // APT
    markets.insert("31".to_string(), MarketData::default()); // SOL

    Self {
      markets,
      state: "IDLE".to_string(),
      heartbeat_counter: 0,
    }
  }
}

#[derive(Debug)]
pub struct TradingCoreService {
  state: Arc<RwLock<EngineState>>,
  ws_url: String,
  candle_store: Arc<CandleStore>,
  market_data: Arc<MarketDataService>,
}

const MAINNET_WS_URL: &str = "wss://perpetuals-indexer-ws.kana.trade/ws/";

impl TradingCoreService {
  pub fn new() -> Self {
    let config = CandleStoreConfig::default();
    let candle_store = Arc::new(CandleStore::new(config));

    Self {
      state: Arc::new(RwLock::new(EngineState::default())),
      ws_url: MAINNET_WS_URL.to_string(),
      candle_store: candle_store.clone(),
      market_data: Arc::new(MarketDataService::new(candle_store)),
    }
  }

  async fn connect_market_data(&self, market_id: &str) -> Result<()> {
    let url =
      Url::parse(&self.ws_url).map_err(|e| anyhow!("Failed to parse WebSocket URL: {}", e))?;

    // Connect orderbook websocket
    let (ws_stream, _) = connect_async(url.clone())
      .await
      .map_err(|e| anyhow!("Failed to connect to WebSocket: {}", e))?;

    info!("Orderbook WebSocket connected successfully");

    let (mut write, mut read) = ws_stream.split();

    // Subscribe to orderbook
    let orderbook_req = WsRequest {
      topic: WsTopics::Orderbook,
      market_id: market_id.to_string(),
    };

    write
      .send(Message::Text(serde_json::to_string(&orderbook_req)?))
      .await
      .map_err(|e| anyhow!("Failed to subscribe to orderbook: {}", e))?;

    // Connect trades websocket
    let (ws_stream2, _) = connect_async(url)
      .await
      .map_err(|e| anyhow!("Failed to connect to WebSocket: {}", e))?;

    info!("Trades WebSocket connected successfully");

    let (mut write2, mut read2) = ws_stream2.split();

    // Subscribe to trades
    let trades_req = WsRequest {
      topic: WsTopics::RecentTrades,
      market_id: market_id.to_string(),
    };

    write2
      .send(Message::Text(serde_json::to_string(&trades_req)?))
      .await
      .map_err(|e| anyhow!("Failed to subscribe to trades: {}", e))?;

    let market_data1 = Arc::clone(&self.market_data);
    let market_data2 = Arc::clone(&self.market_data);

    // Handle orderbook messages
    tokio::spawn(async move {
      while let Some(msg) = read.next().await {
        match msg {
          Ok(Message::Text(text)) => {
            if let Err(e) = market_data1.handle_ws_message(text).await {
              error!("Failed to handle orderbook message: {}", e);
            }
          }
          Ok(Message::Close(frame)) => {
            info!("Orderbook WebSocket closed: {:?}", frame);
            break;
          }
          Err(e) => {
            error!("Orderbook WebSocket error: {}", e);
            break;
          }
          _ => (),
        }
      }
    });

    // Handle trades messages
    tokio::spawn(async move {
      while let Some(msg) = read2.next().await {
        match msg {
          Ok(Message::Text(text)) => {
            if let Err(e) = market_data2.handle_ws_message(text).await {
              error!("Failed to handle trades message: {}", e);
            }
          }
          Ok(Message::Close(frame)) => {
            info!("Trades WebSocket closed: {:?}", frame);
            break;
          }
          Err(e) => {
            error!("Trades WebSocket error: {}", e);
            break;
          }
          _ => (),
        }
      }
    });

    Ok(())
  }
}

#[tonic::async_trait]
impl TradingCore for TradingCoreService {
  async fn get_candles(
    &self,
    request: Request<GetCandlesRequest>,
  ) -> Result<Response<GetCandlesResponse>, Status> {
    let req = request.into_inner();
    let candles = self
      .candle_store
      .get_candles(
        &req.market_id,
        match req.timeframe.as_str() {
          "1m" | "M1" => data::candles::types::TimeFrame::M1,
          "5m" | "M5" => data::candles::types::TimeFrame::M5,
          "15m" | "M15" => data::candles::types::TimeFrame::M15,
          "30m" | "M30" => data::candles::types::TimeFrame::M30,
          "1h" | "H1" => data::candles::types::TimeFrame::H1,
          "4h" | "H4" => data::candles::types::TimeFrame::H4,
          "1d" | "D1" => data::candles::types::TimeFrame::D1,
          _ => return Err(Status::invalid_argument("Invalid timeframe")),
        },
        req.count as usize,
      )
      .await;
    let candle_data = candles
      .into_iter()
      .map(|c| CandleData {
        market_id: c.market_id,
        timeframe: c.timeframe.to_string(),
        start_time: c.start_time.timestamp(),
        end_time: c.end_time.timestamp(),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        tick_count: c.tick_count,
        vwap: c.vwap,
        spread_avg: c.spread_avg,
        spread_min: c.spread_min,
        spread_max: c.spread_max,
        is_closed: c.is_closed,
      })
      .collect();
    Ok(Response::new(GetCandlesResponse {
      candles: candle_data,
    }))
  }

  async fn test_web_socket(
    &self,
    request: Request<TestWebSocketRequest>,
  ) -> Result<Response<TestWebSocketResponse>, Status> {
    let req = request.into_inner();
    match self.connect_market_data(&req.address).await {
      Ok(_) => Ok(Response::new(TestWebSocketResponse {
        success: true,
        message: "WebSocket connection test successful".to_string(),
      })),
      Err(e) => Ok(Response::new(TestWebSocketResponse {
        success: false,
        message: format!("WebSocket connection test failed: {}", e),
      })),
    }
  }

  // Unimplemented methods with default responses
  async fn set_params(
    &self,
    _: Request<SetParamsRequest>,
  ) -> Result<Response<SetParamsResponse>, Status> {
    Err(Status::unimplemented("Not implemented"))
  }

  async fn update_risk(
    &self,
    _: Request<UpdateRiskRequest>,
  ) -> Result<Response<UpdateRiskResponse>, Status> {
    Err(Status::unimplemented("Not implemented"))
  }

  async fn send_command(
    &self,
    _: Request<SendCommandRequest>,
  ) -> Result<Response<SendCommandResponse>, Status> {
    Err(Status::unimplemented("Not implemented"))
  }

  type StreamMetricsStream = ReceiverStream<Result<Metric, Status>>;

  async fn stream_metrics(
    &self,
    _: Request<StreamMetricsRequest>,
  ) -> Result<Response<Self::StreamMetricsStream>, Status> {
    Err(Status::unimplemented("Not implemented"))
  }
}

#[tokio::main]
async fn main() -> Result<()> {
  // Initialize tracing
  tracing_subscriber::fmt::init();

  let addr = "0.0.0.0:50051".parse()?;
  let trading_core = TradingCoreService::new();

  // Connect to market data for BTC
  info!("Connecting to market data...");
  if let Err(e) = trading_core.connect_market_data("15").await {
    error!("Failed to connect to market data: {}", e);
  }

  info!("TradingCore gRPC server starting on {}", addr);

  // Add reflection service
  let reflection_service = ReflectionBuilder::configure()
    .register_encoded_file_descriptor_set(include_bytes!("generated/descriptor.bin"))
    .build()?;

  Server::builder()
    .add_service(TradingCoreServer::new(trading_core))
    .add_service(reflection_service)
    .serve(addr)
    .await?;

  Ok(())
}
