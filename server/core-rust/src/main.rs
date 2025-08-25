use anyhow::{anyhow, Result};

use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio_stream::wrappers::ReceiverStream;
use tonic::{transport::Server, Request, Response, Status};
use tonic_reflection::server::Builder as ReflectionBuilder;
use tracing::{error, info, warn};

use futures_util::{SinkExt, StreamExt};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use url::Url;

pub mod generated {
  tonic::include_proto!("core");
}
pub mod types;

use generated::trading_core_server::{TradingCore, TradingCoreServer};
use generated::*;

use crate::types::{BestPrice, Order, Position, WsRequest, WsResponse, WsTopics};

#[derive(Debug, Clone)]
struct EngineState {
  symbol: String,
  mid_price: f64,
  bid_price: f64,
  ask_price: f64,
  spread: f64,           // bid-ask spread percentage
  volume_24h: f64,       // 24h trading volume
  price_change_24h: f64, // 24h price change percentage
  state: String,
  heartbeat_counter: u64,
}

impl Default for EngineState {
  fn default() -> Self {
    Self {
      symbol: "BTC/USDT".to_string(), // Match WebSocket market_id format
      mid_price: 0.0,
      bid_price: 0.0,
      ask_price: 0.0,
      spread: 0.0,
      volume_24h: 0.0,
      price_change_24h: 0.0,
      state: "IDLE".to_string(),
      heartbeat_counter: 0,
    }
  }
}

// State shared between threads
#[derive(Debug)]
pub struct TradingCoreService {
  state: Arc<RwLock<EngineState>>,
  ws_url: String,
}

const MAINNET_WS_URL: &str = "wss://perpetuals-indexer-ws.kana.trade/ws/";
const TESTNET_WS_URL: &str = "wss://perpetuals-indexer-ws-develop.kanalabs.io/ws/";

impl TradingCoreService {
  pub fn new() -> Self {
    Self {
      state: Arc::new(RwLock::new(EngineState::default())),
      ws_url: TESTNET_WS_URL.to_string(), // Default to testnet
    }
  }

  pub async fn connect_websocket(&self, address: String) -> Result<()> {
    let url =
      Url::parse(&self.ws_url).map_err(|e| anyhow!("Failed to parse WebSocket URL: {}", e))?;

    let (ws_stream, _) = connect_async(url)
      .await
      .map_err(|e| anyhow!("Failed to connect to WebSocket: {}", e))?;

    info!("WebSocket connected successfully");

    let (mut write, mut read) = ws_stream.split();

    // Subscribe to BTC price (market_id: 1339)
    let btc_price_req: String = serde_json::json!({
        "topic": "bestPrice",
        "market_id": "1339"
    })
    .to_string();

    info!("Sending BTC price subscription: {}", btc_price_req);
    write
      .send(Message::Text(btc_price_req))
      .await
      .map_err(|e| anyhow!("Failed to subscribe to BTC price: {}", e))?;

    // // Subscribe to ETH price (market_id: 1340)
    // let eth_price_req = serde_json::json!({
    //     "topic": "bestPrice",
    //     "market_id": "1340"
    // })
    // .to_string();

    // info!("Sending ETH price subscription: {}", eth_price_req);
    // write
    //   .send(Message::Text(eth_price_req))
    //   .await
    //   .map_err(|e| anyhow!("Failed to subscribe to ETH price: {}", e))?;

    // // Subscribe to APT price (market_id: 1338)
    // let apt_price_req = serde_json::json!({
    //     "topic": "bestPrice",
    //     "market_id": "1338"
    // })
    // .to_string();

    // info!("Sending APT price subscription: {}", apt_price_req);
    // write
    //   .send(Message::Text(apt_price_req))
    //   .await
    //   .map_err(|e| anyhow!("Failed to subscribe to APT price: {}", e))?;

    let state = Arc::clone(&self.state);

    // Handle incoming messages
    tokio::spawn(async move {
      while let Some(msg) = read.next().await {
        info!("msg: {:?}", msg);
        match msg {
          Ok(Message::Text(text)) => {
            info!("=== WebSocket Message Start ===");
            info!("Raw message: {}", text);

            // Pretty print JSON for better readability
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(&text) {
              info!(
                "Formatted JSON:\n{}",
                serde_json::to_string_pretty(&json).unwrap()
              );
            }
            info!("=== WebSocket Message End ===\n");

            match serde_json::from_str::<WsResponse<serde_json::Value>>(&text) {
              Ok(response) => {
                info!("Parsed WebSocket message: {:?}", response);
                match response.message.as_str() {
                  "bestPrice" => {
                    if let Ok(price) = serde_json::from_value::<BestPrice>(response.data) {
                      // Update state with new price
                      let mut state = state.write().await;
                      state.symbol = price.symbol.clone();
                      state.mid_price = price.mid_price;
                      state.bid_price = price.bid;
                      state.ask_price = price.ask;

                      // Calculate spread percentage
                      state.spread = ((price.ask - price.bid) / price.mid_price) * 100.0;

                      // TODO: Get these from market data API
                      state.volume_24h = 1000000.0; // Example value
                      state.price_change_24h = 2.5; // Example value

                      info!(
                        "Price update - Symbol: {}, Mid: {:.2}, Bid: {:.2}, Ask: {:.2}, Spread: {:.3}%, Vol 24h: ${:.2}M, Change 24h: {:.2}%",
                        price.symbol, price.mid_price, price.bid, price.ask,
                        state.spread, state.volume_24h / 1_000_000.0, state.price_change_24h
                      );
                    }
                  }
                  _ => info!("Received message type: {}", response.message),
                }
              }
              Err(e) => error!("Failed to parse WebSocket message: {}", e),
            }
          }
          Ok(Message::Close(frame)) => {
            info!("WebSocket connection closed: {:?}", frame);
            break;
          }
          Err(e) => {
            error!("WebSocket error: {}", e);
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
  // Test WebSocket connection
  async fn test_web_socket(
    &self,
    request: Request<TestWebSocketRequest>,
  ) -> Result<Response<TestWebSocketResponse>, Status> {
    let req = request.into_inner();
    let address = req.address;

    info!("Testing WebSocket connection for address: {}", address);

    match self.connect_websocket(address).await {
      Ok(_) => Ok(Response::new(TestWebSocketResponse {
        success: true,
        message: "WebSocket connected successfully".to_string(),
      })),
      Err(e) => Ok(Response::new(TestWebSocketResponse {
        success: false,
        message: format!("Failed to connect: {}", e),
      })),
    }
  }

  async fn set_params(
    &self,
    request: Request<SetParamsRequest>,
  ) -> Result<Response<SetParamsResponse>, Status> {
    let req = request.into_inner();

    if let Some(params) = req.params {
      let mut state = self.state.write().await;
      state.symbol = params.symbol;

      info!(
        "Set params: symbol={}, min_spread_ticks={}, max_inventory={}",
        state.symbol, params.min_spread_ticks, params.max_inventory
      );
    }

    Ok(Response::new(SetParamsResponse {
      success: true,
      message: "Parameters updated successfully".to_string(),
    }))
  }

  async fn update_risk(
    &self,
    request: Request<UpdateRiskRequest>,
  ) -> Result<Response<UpdateRiskResponse>, Status> {
    let req = request.into_inner();

    if let Some(_risk_params) = req.risk_params {
      info!(
        "Updated risk: max_leverage={}, max_position_size={}, allow_new_orders={}",
        _risk_params.max_leverage, _risk_params.max_position_size, _risk_params.allow_new_orders
      );
    }

    Ok(Response::new(UpdateRiskResponse {
      success: true,
      message: "Risk parameters updated successfully".to_string(),
    }))
  }

  async fn send_command(
    &self,
    request: Request<SendCommandRequest>,
  ) -> Result<Response<SendCommandResponse>, Status> {
    let req = request.into_inner();

    let msg = if let Some(command) = req.command {
      let mut state = self.state.write().await;

      let msg = match CommandType::from_i32(command.command) {
        Some(CommandType::Start) => {
          state.state = "RUNNING".to_string();
          info!("Engine started: {}", command.reason);
          "Engine started successfully"
        }
        Some(CommandType::Stop) => {
          state.state = "STOPPED".to_string();
          info!("Engine stopped: {}", command.reason);
          "Engine stopped successfully"
        }
        Some(CommandType::FlatAll) => "Flat all positions",

        Some(CommandType::PauseNew) => {
          state.state = "PAUSED".to_string();
          info!("Pausing new orders: {}", command.reason);
          "Pausing new orders successfully"
        }
        Some(CommandType::Resume) => {
          state.state = "RESUMED".to_string();
          info!("Resuming operations: {}", command.reason);
          "Resuming operations successfully"
        }
        None => {
          warn!("Invalid command type: {}", command.command);
          "Invalid command type"
        }
      };

      Response::new(SendCommandResponse {
        success: true,
        message: msg.to_string(),
      })
    } else {
      warn!("No command provided");
      Response::new(SendCommandResponse {
        success: false,
        message: "No command provided".to_string(),
      })
    };

    Ok(msg)
  }

  type StreamMetricsStream = ReceiverStream<Result<Metric, Status>>;

  async fn stream_metrics(
    &self,
    _request: Request<StreamMetricsRequest>,
  ) -> Result<Response<Self::StreamMetricsStream>, Status> {
    let (tx, rx) = tokio::sync::mpsc::channel(100);

    let state = Arc::clone(&self.state);

    tokio::spawn(async move {
      let mut interval = tokio::time::interval(Duration::from_secs(2));

      loop {
        interval.tick().await;

        let mut current_state = state.write().await;
        current_state.heartbeat_counter += 1;

        // Use real market data from state
        // Price updates are handled by WebSocket callback

        let metric = Metric {
          timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64,
          symbol: current_state.symbol.clone(),
          mid_price: current_state.mid_price,
          bid_price: current_state.bid_price,
          ask_price: current_state.ask_price,
          spread: current_state.spread,
          volume_24h: current_state.volume_24h,
          price_change_24h: current_state.price_change_24h,
          state: current_state.state.clone(),
          heartbeat_counter: current_state.heartbeat_counter as i64,
        };

        info!(
          "Metric: {} {} Mid={:.2} Bid={:.2} Ask={:.2} Spread={:.3}% Vol=${:.2}M Chg={:.2}% State={} HB={}",
          metric.timestamp,
          metric.symbol,
          metric.mid_price,
          metric.bid_price,
          metric.ask_price,
          metric.spread,
          metric.volume_24h / 1_000_000.0,
          metric.price_change_24h,
          metric.state,
          metric.heartbeat_counter
        );

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
  // Initialize tracing
  tracing_subscriber::fmt::init();

  let addr = "0.0.0.0:50051".parse()?;
  let trading_core = TradingCoreService::new();

  info!("TradingCore gRPC server starting on {}", addr);

  // Add reflection service
  let reflection_service = ReflectionBuilder::configure()
    .register_encoded_file_descriptor_set(include_bytes!("generated/descriptor.bin"))
    .build()?;

  // Add trading core service
  Server::builder()
    .add_service(TradingCoreServer::new(trading_core))
    .add_service(reflection_service)
    .serve(addr)
    .await?;

  Ok(())
}
