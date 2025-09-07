use anyhow::{anyhow, Result};
use futures_util::{SinkExt, StreamExt};
use serde_json;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::{mpsc, RwLock};
use tokio::time::{sleep, Instant};
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use tracing::{error, info, warn};
use url::Url;

use data::market_data::{MarketDataService, WsRequest};

#[derive(Debug, Clone, PartialEq)]
pub enum ConnectionState {
  Connected,
  Disconnected,
  Reconnecting,
}

#[derive(Debug, Clone)]
pub struct ReconnectionConfig {
  pub initial_delay_ms: u64,
  pub max_delay_ms: u64,
  pub max_attempts: Option<u32>,
  pub backoff_multiplier: f64,
}

impl Default for ReconnectionConfig {
  fn default() -> Self {
    Self {
      initial_delay_ms: 1000,   // 1 second
      max_delay_ms: 30000,      // 30 seconds
      max_attempts: None,       // Infinite attempts
      backoff_multiplier: 2.0,
    }
  }
}

#[derive(Debug)]
pub struct WebSocketManager {
  url: String,
  state: Arc<RwLock<ConnectionState>>,
  config: ReconnectionConfig,
  market_data_service: Arc<MarketDataService>,
}

impl WebSocketManager {
  pub fn new(
    url: String,
    config: ReconnectionConfig,
    market_data_service: Arc<MarketDataService>,
  ) -> Self {
    Self {
      url,
      state: Arc::new(RwLock::new(ConnectionState::Disconnected)),
      config,
      market_data_service,
    }
  }

  pub async fn get_state(&self) -> ConnectionState {
    self.state.read().await.clone()
  }

  async fn set_state(&self, new_state: ConnectionState) {
    let mut state = self.state.write().await;
    *state = new_state;
  }

  fn calculate_delay(&self, attempt: u32) -> Duration {
    let delay_ms = (self.config.initial_delay_ms as f64
      * self.config.backoff_multiplier.powi(attempt as i32) as f64)
      .min(self.config.max_delay_ms as f64) as u64;
    
    Duration::from_millis(delay_ms)
  }

  pub async fn connect_with_subscription(&self, subscription_request: WsRequest) -> Result<()> {
    let mut attempt = 0u32;
    let start_time = Instant::now();

    loop {
      if let Some(max_attempts) = self.config.max_attempts {
        if attempt >= max_attempts {
          return Err(anyhow!(
            "Max reconnection attempts ({}) exceeded after {:?}",
            max_attempts,
            start_time.elapsed()
          ));
        }
      }

      attempt += 1;
      
      // Set state to reconnecting unless it's the first attempt
      if attempt > 1 {
        self.set_state(ConnectionState::Reconnecting).await;
        let delay = self.calculate_delay(attempt - 1);
        warn!(
          "WebSocket disconnected. Retrying connection in {:?} (attempt {}/{})",
          delay,
          attempt,
          self.config.max_attempts.map_or("∞".to_string(), |m| m.to_string())
        );
        sleep(delay).await;
      }

      match self.attempt_connection(&subscription_request).await {
        Ok(_) => {
          info!(
            "WebSocket connection established successfully after {} attempt(s) in {:?}",
            attempt,
            start_time.elapsed()
          );
          self.set_state(ConnectionState::Connected).await;
          // Reset attempt counter on successful connection
          return Ok(());
        }
        Err(e) => {
          error!("WebSocket connection attempt {} failed: {}", attempt, e);
          self.set_state(ConnectionState::Disconnected).await;
          // Continue to next attempt unless we've hit max attempts
          continue;
        }
      }
    }
  }

  async fn attempt_connection(&self, subscription_request: &WsRequest) -> Result<()> {
    let url = Url::parse(&self.url)
      .map_err(|e| anyhow!("Failed to parse WebSocket URL: {}", e))?;

    info!("Attempting to connect to WebSocket: {}", self.url);

    let (ws_stream, _) = connect_async(url)
      .await
      .map_err(|e| anyhow!("Failed to connect to WebSocket: {}", e))?;

    let (mut write, mut read) = ws_stream.split();

    // Subscribe to the topic
    let subscription_json = serde_json::to_string(subscription_request)
      .map_err(|e| anyhow!("Failed to serialize subscription request: {}", e))?;

    write
      .send(Message::Text(subscription_json))
      .await
      .map_err(|e| anyhow!("Failed to send subscription: {}", e))?;

    info!(
      "Successfully subscribed to {:?} for market {}",
      subscription_request.topic, subscription_request.market_id
    );

    // Set up channels for graceful shutdown
    let (_shutdown_tx, mut shutdown_rx) = mpsc::unbounded_channel::<()>();
    let market_data_service = Arc::clone(&self.market_data_service);
    let state = Arc::clone(&self.state);

    // Handle incoming messages
    tokio::spawn(async move {
      loop {
        tokio::select! {
          msg = read.next() => {
            match msg {
              Some(Ok(Message::Text(text))) => {
                if let Err(e) = market_data_service.handle_ws_message(text).await {
                  error!("Failed to handle WebSocket message: {}", e);
                }
              }
              Some(Ok(Message::Close(frame))) => {
                info!("WebSocket closed: {:?}", frame);
                let mut state_guard = state.write().await;
                *state_guard = ConnectionState::Disconnected;
                drop(state_guard);
                break;
              }
              Some(Ok(Message::Ping(payload))) => {
                // Handle ping/pong for connection keepalive
                if let Err(e) = write.send(Message::Pong(payload)).await {
                  error!("Failed to send pong: {}", e);
                  break;
                }
              }
              Some(Err(e)) => {
                error!("WebSocket error: {}", e);
                let mut state_guard = state.write().await;
                *state_guard = ConnectionState::Disconnected;
                drop(state_guard);
                break;
              }
              None => {
                warn!("WebSocket stream ended");
                let mut state_guard = state.write().await;
                *state_guard = ConnectionState::Disconnected;
                drop(state_guard);
                break;
              }
              _ => {
                // Handle other message types if needed
              }
            }
          }
          _ = shutdown_rx.recv() => {
            info!("Received shutdown signal, closing WebSocket connection");
            if let Err(e) = write.send(Message::Close(None)).await {
              warn!("Failed to send close frame: {}", e);
            }
            break;
          }
        }
      }
    });

    // Keep the connection alive and monitor state
    let state_monitor = Arc::clone(&self.state);
    tokio::spawn(async move {
      loop {
        sleep(Duration::from_secs(5)).await;
        let current_state = state_monitor.read().await.clone();
        if current_state == ConnectionState::Disconnected {
          break;
        }
      }
    });

    // Wait for disconnection to trigger reconnection logic
    loop {
      sleep(Duration::from_millis(100)).await;
      let current_state = self.get_state().await;
      if current_state == ConnectionState::Disconnected {
        return Err(anyhow!("Connection lost, triggering reconnection"));
      }
    }
  }

  pub async fn start_persistent_connection(&self, subscription_request: WsRequest) {
    let manager = self.clone();
    tokio::spawn(async move {
      loop {
        info!("Starting WebSocket connection attempt...");
        if let Err(e) = manager.connect_with_subscription(subscription_request.clone()).await {
          error!("WebSocket connection failed, will retry: {}", e);
          sleep(Duration::from_millis(500)).await;
        }
        // Brief pause before attempting reconnection
        sleep(Duration::from_millis(100)).await;
      }
    });
  }
}

impl Clone for WebSocketManager {
  fn clone(&self) -> Self {
    Self {
      url: self.url.clone(),
      state: Arc::clone(&self.state),
      config: self.config.clone(),
      market_data_service: Arc::clone(&self.market_data_service),
    }
  }
}