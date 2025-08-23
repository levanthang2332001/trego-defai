use anyhow::Result;

use std::sync::Arc;
use std::time::Duration;
use tokio::sync::RwLock;
use tokio_stream::wrappers::ReceiverStream;
use tonic::{transport::Server, Request, Response, Status};
use tonic_reflection::server::Builder as ReflectionBuilder;
use tracing::{info, warn};

pub mod generated {
  tonic::include_proto!("core");
}

use generated::trading_core_server::{TradingCore, TradingCoreServer};
use generated::*;

#[derive(Debug, Clone)]
struct EngineState {
  symbol: String,
  mid_price: f64,
  sigma: f64,
  unrealized_pnl: f64,
  state: String,
  inventory: f64,
  heartbeat_counter: u64,
}

impl Default for EngineState {
  fn default() -> Self {
    Self {
      symbol: "BTCUSDT".to_string(),
      mid_price: 45000.0,
      sigma: 0.02,
      unrealized_pnl: 0.0,
      state: "IDLE".to_string(),
      inventory: 0.0,
      heartbeat_counter: 0,
    }
  }
}

// State shared between threads
#[derive(Debug)]
pub struct TradingCoreService {
  state: Arc<RwLock<EngineState>>,
}

impl TradingCoreService {
  pub fn new() -> Self {
    Self {
      state: Arc::new(RwLock::new(EngineState::default())),
    }
  }
}

#[tonic::async_trait]
impl TradingCore for TradingCoreService {
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
          state.state = "RUNNING".to_string();
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
    request: Request<StreamMetricsRequest>,
  ) -> Result<Response<Self::StreamMetricsStream>, Status> {
    let (tx, rx) = tokio::sync::mpsc::channel(100);

    let state = Arc::clone(&self.state);

    tokio::spawn(async move {
      let mut interval = tokio::time::interval(Duration::from_secs(2));

      loop {
        interval.tick().await;

        let mut current_state = state.write().await;
        current_state.heartbeat_counter += 1;

        // Simulate some market movement
        current_state.mid_price += (rand::random() - 0.5) * 100.0;
        current_state.sigma = 0.01 + rand::random() * 0.03;
        current_state.unrealized_pnl += (rand::random() - 0.5) * 10.0;

        let metric = Metric {
          timestamp: std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_secs() as i64,
          symbol: current_state.symbol.clone(),
          mid_price: current_state.mid_price,
          sigma: current_state.sigma,
          unrealized_pnl: current_state.unrealized_pnl,
          state: current_state.state.clone(),
          inventory: current_state.inventory,
          heartbeat_counter: current_state.heartbeat_counter as i64,
        };

        info!(
          "Metric: {} {} mid={:.2} sigma={:.4} upnl={:.2} state={} heartbeat={}",
          metric.timestamp,
          metric.symbol,
          metric.mid_price,
          metric.sigma,
          metric.unrealized_pnl,
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

// TODO: Add proper random number generation - using std::rand for demo
mod rand {
  use std::time::{SystemTime, UNIX_EPOCH};

  pub fn random() -> f64 {
    let nanos = SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .unwrap()
      .subsec_nanos();
    (nanos as f64) / (u32::MAX as f64)
  }
}
