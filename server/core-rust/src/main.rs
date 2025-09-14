use anyhow::Result;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio_stream::wrappers::ReceiverStream;
use tonic::{transport::Server, Request, Response, Status};
use tonic_reflection::server::Builder as ReflectionBuilder;
use tracing::{error, info};

use chrono::Utc;

use data::{
  candles::store::{CandleStore, CandleStoreConfig},
  market_data::{MarketDataService, WsRequest, WsTopics},
  trading::{MarketMaker, ParamsValidator, TradingState},
};

mod database;
use database::{DatabaseManager, Token};

use types::trading_core_server::{TradingCore, TradingCoreServer};
use types::*;

mod websocket;
use websocket::{ReconnectionConfig, WebSocketManager};

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
  heartbeat_counter: i64,
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
  trading_state: Arc<TradingState>,
  market_maker: Arc<MarketMaker>,
  database_manager: Option<Arc<DatabaseManager>>,
  orderbook_manager: Option<WebSocketManager>,
  trades_manager: Option<WebSocketManager>,
}

const MAINNET_WS_URL: &str = "wss://perpetuals-indexer-ws.kana.trade/ws/";

impl TradingCoreService {
  pub fn new() -> Self {
    let config = CandleStoreConfig::default();
    let candle_store = Arc::new(CandleStore::new(config));
    let trading_state = Arc::new(TradingState::new());
    let market_maker = Arc::new(MarketMaker::new(trading_state.clone()));

    // Start periodic candle closure task
    CandleStore::start_periodic_closure(candle_store.clone());

    Self {
      state: Arc::new(RwLock::new(EngineState::default())),
      ws_url: MAINNET_WS_URL.to_string(),
      candle_store: candle_store.clone(),
      market_data: Arc::new(MarketDataService::new(candle_store)),
      trading_state,
      market_maker,
      database_manager: None,
      orderbook_manager: None,
      trades_manager: None,
    }
  }

  pub async fn new_with_database(database_url: &str) -> Result<Self> {
    // Create database manager with verification
    let database_manager = Arc::new(DatabaseManager::new(database_url).await?);

    // Note: Migrations should be run separately using sqlx-cli
    // Run: sqlx migrate run --source ./src/database/migrations

    let config = CandleStoreConfig::default();
    let candle_db = Arc::new(database_manager.candle_db().clone());
    let candle_store = Arc::new(CandleStore::new_with_database(config, candle_db.clone()));
    let trading_state = Arc::new(TradingState::new());
    let market_maker = Arc::new(MarketMaker::new(trading_state.clone()));

    // Start periodic candle closure task
    CandleStore::start_periodic_closure(candle_store.clone());

    Ok(Self {
      state: Arc::new(RwLock::new(EngineState::default())),
      ws_url: MAINNET_WS_URL.to_string(),
      candle_store: candle_store.clone(),
      market_data: Arc::new(MarketDataService::new_with_database(
        candle_store,
        candle_db,
      )),
      trading_state,
      market_maker,
      database_manager: Some(database_manager),
      orderbook_manager: None,
      trades_manager: None,
    })
  }

  pub async fn update_market_data(&self, market_id: &str, bid: f64, ask: f64, volume: f64) {
    let mut state = self.state.write().await;
    if let Some(market) = state.markets.get_mut(market_id) {
      market.bid_price = bid;
      market.ask_price = ask;
      market.mid_price = (bid + ask) / 2.0;
      market.spread = ((ask - bid) / market.mid_price) * 100.0; // Percentage
      market.volume_24h = volume;
    }
  }

  pub async fn connect_market_data(&self, market_id: &str) -> Result<()> {
    let reconnection_config = ReconnectionConfig {
      initial_delay_ms: 1000,
      max_delay_ms: 30000,
      max_attempts: None, // Infinite attempts
      backoff_multiplier: 2.0,
    };

    // Create orderbook manager
    let orderbook_manager = WebSocketManager::new(
      self.ws_url.clone(),
      reconnection_config.clone(),
      self.market_data.clone(),
    );

    // Create trades manager
    let trades_manager = WebSocketManager::new(
      self.ws_url.clone(),
      reconnection_config,
      self.market_data.clone(),
    );

    // Start persistent orderbook connection
    let orderbook_request = WsRequest {
      topic: WsTopics::Orderbook,
      market_id: market_id.to_string(),
    };

    info!(
      "Starting persistent orderbook WebSocket connection for market {}",
      market_id
    );
    orderbook_manager
      .start_persistent_connection(orderbook_request)
      .await;

    // Start persistent trades connection
    let trades_request = WsRequest {
      topic: WsTopics::RecentTrades,
      market_id: market_id.to_string(),
    };

    info!(
      "Starting persistent trades WebSocket connection for market {}",
      market_id
    );
    trades_manager
      .start_persistent_connection(trades_request)
      .await;

    info!("Market data connections initialized with automatic reconnection");
    Ok(())
  }

  /// Get database manager reference
  pub fn database_manager(&self) -> Option<&Arc<DatabaseManager>> {
    self.database_manager.as_ref()
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
          "3m" | "M3" => data::candles::types::TimeFrame::M3,
          "5m" | "M5" => data::candles::types::TimeFrame::M5,
          "15m" | "M15" => data::candles::types::TimeFrame::M15,
          "30m" | "M30" => data::candles::types::TimeFrame::M30,
          "1h" | "H1" => data::candles::types::TimeFrame::H1,
          "2h" | "H2" => data::candles::types::TimeFrame::H2,
          "4h" | "H4" => data::candles::types::TimeFrame::H4,
          "6h" | "H6" => data::candles::types::TimeFrame::H6,
          "12h" | "H12" => data::candles::types::TimeFrame::H12,
          "1d" | "D1" => data::candles::types::TimeFrame::D1,
          "1w" | "W1" => data::candles::types::TimeFrame::W1,
          "1M" | "MN1" => data::candles::types::TimeFrame::MN1,
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
    request: Request<SetParamsRequest>,
  ) -> Result<Response<SetParamsResponse>, Status> {
    let req = request.into_inner();

    // Check if params exists
    let params = match req.params {
      Some(p) => p,
      None => {
        return Ok(Response::new(SetParamsResponse {
          success: false,
          message: "No parameters provided".to_string(),
        }))
      }
    };

    // Validate parameters
    if let Err(e) = ParamsValidator::validate_params(&params) {
      return Ok(Response::new(SetParamsResponse {
        success: false,
        message: format!("Invalid parameters: {} - {}", e.field, e.message),
      }));
    }

    // Update trading state
    if let Err(e) = self
      .trading_state
      .update_params(req.market_id, params.clone())
      .await
    {
      return Ok(Response::new(SetParamsResponse {
        success: false,
        message: format!("Failed to update parameters: {}", e),
      }));
    }

    // Recalculate quotes
    if let Err(e) = self
      .market_maker
      .recalculate_quotes(req.market_id, &params)
      .await
    {
      return Ok(Response::new(SetParamsResponse {
        success: false,
        message: format!("Failed to recalculate quotes: {}", e),
      }));
    }

    Ok(Response::new(SetParamsResponse {
      success: true,
      message: "Parameters updated successfully".to_string(),
    }))
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
    let (tx, rx) = tokio::sync::mpsc::channel(100);
    let state = self.state.clone();
    let market_data = self.market_data.clone();

    // Spawn background task to send metrics
    tokio::spawn(async move {
      let mut interval = tokio::time::interval(Duration::from_secs(2));
      loop {
        interval.tick().await;

        // Get engine state and increment heartbeat
        let mut state = state.write().await;
        state.heartbeat_counter += 1;

        // Log heartbeat every 30 seconds (15 ticks at 2s interval)
        if state.heartbeat_counter % 15 == 0 {
          info!("Server heartbeat: {}", state.heartbeat_counter);
        }

        // Get real market data from orderbook
        let best_bid = market_data.get_best_bid("15").await;
        let best_ask = market_data.get_best_ask("15").await;
        let volume_24h = market_data.get_volume_24h("15").await;

        let (bid_price, ask_price, mid_price, spread) =
          if let (Some(bid), Some(ask)) = (best_bid, best_ask) {
            let mid = (bid.price + ask.price) / 2.0;
            let spread_pct = ((ask.price - bid.price) / mid) * 100.0;
            (bid.price, ask.price, mid, spread_pct)
          } else {
            (0.0, 0.0, 0.0, 0.0)
          };

        let metric = Metric {
          timestamp: Utc::now().timestamp(),
          symbol: "BTC".to_string(),
          mid_price,
          bid_price,
          ask_price,
          spread,
          volume_24h: volume_24h,
          price_change_24h: 0.0, // TODO: Calculate from historical data
          state: state.state.clone(),
          heartbeat_counter: state.heartbeat_counter,
        };

        info!("Sending metric: {:?}", metric);
        if tx.send(Ok(metric)).await.is_err() {
          break;
        }
      }
    });

    Ok(Response::new(ReceiverStream::new(rx)))
  }
}

#[tokio::main]
async fn main() -> Result<()> {
  // Load environment variables from .env file
  if let Err(e) = dotenvy::dotenv() {
    tracing::warn!("Failed to load .env file: {}", e);
  }

  // Initialize tracing
  tracing_subscriber::fmt::init();

  let addr = "0.0.0.0:50051".parse()?;

  // Try to get database URL from environment
  let database_url = std::env::var("DATABASE_URL").ok();

  // Display supported tokens
  info!("🪙 Supported Tokens:");
  for token in Token::all_tokens() {
    info!(
      "   {} ({}): {} - {} decimals",
      token.symbol(),
      token.market_id(),
      token.full_name(),
      token.decimals()
    );
  }

  let trading_core = match database_url {
    Some(url) => {
      info!("🗄️  Initializing with PostgreSQL database");
      TradingCoreService::new_with_database(&url).await?
    }
    None => {
      info!("⚠️  No DATABASE_URL found, initializing without database persistence");
      info!("   Set DATABASE_URL to enable persistent candle storage");
      TradingCoreService::new()
    }
  };

  // Connect to market data for all supported tokens
  info!("📡 Connecting to market data for all tokens...");
  for token in Token::all_tokens() {
    info!(
      "   Connecting to {} ({})",
      token.symbol(),
      token.market_id()
    );
    if let Err(e) = trading_core.connect_market_data(token.market_id()).await {
      error!(
        "Failed to connect to market data for {}: {}",
        token.symbol(),
        e
      );
    } else {
      info!("   ✅ {} connected", token.symbol());
    }
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
