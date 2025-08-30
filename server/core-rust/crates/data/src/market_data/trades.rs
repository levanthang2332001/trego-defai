use super::types::{MarketVolume, Trade, WsRequest, WsTopics};
use chrono::{DateTime, Duration, Utc};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone)]
pub struct TradeStore {
  // market_id -> list of trades
  trades: Arc<RwLock<HashMap<String, Vec<Trade>>>>,
  // market_id -> volume metrics
  volumes: Arc<RwLock<HashMap<String, MarketVolume>>>,
}

impl TradeStore {
  pub fn new() -> Self {
    Self {
      trades: Arc::new(RwLock::new(HashMap::new())),
      volumes: Arc::new(RwLock::new(HashMap::new())),
    }
  }

  pub fn get_subscription_request(market_id: &str) -> WsRequest {
    WsRequest {
      topic: WsTopics::RecentTrades,
      market_id: market_id.to_string(),
    }
  }

  pub async fn add_trade(&self, trade: Trade) {
    let mut trades = self.trades.write().await;
    let market_trades = trades
      .entry(trade.market_id.clone())
      .or_insert_with(Vec::new);
    market_trades.push(trade.clone());

    // Keep only recent trades (e.g., last 24 hours)
    let cutoff = trade.timestamp - (24 * 60 * 60); // 24 hours ago
    market_trades.retain(|t| t.timestamp > cutoff);

    // Update volume metrics
    self.update_volumes(&trade.market_id).await;
  }

  async fn update_volumes(&self, market_id: &str) {
    let trades = self.trades.read().await;
    if let Some(market_trades) = trades.get(market_id) {
      let now = Utc::now().timestamp();

      // Calculate volumes for different timeframes
      let volume_1m = self.calculate_volume_since(market_trades, now - 60);
      let volume_5m = self.calculate_volume_since(market_trades, now - 5 * 60);
      let volume_15m = self.calculate_volume_since(market_trades, now - 15 * 60);
      let volume_1h = self.calculate_volume_since(market_trades, now - 60 * 60);
      let volume_24h = self.calculate_volume_since(market_trades, now - 24 * 60 * 60);

      let volume = MarketVolume {
        market_id: market_id.to_string(),
        volume_1m,
        volume_5m,
        volume_15m,
        volume_1h,
        volume_24h,
        last_update: now,
      };

      let mut volumes = self.volumes.write().await;
      volumes.insert(market_id.to_string(), volume);
    }
  }

  fn calculate_volume_since(&self, trades: &[Trade], since_timestamp: i64) -> f64 {
    trades
      .iter()
      .filter(|t| t.timestamp >= since_timestamp)
      .map(|t| t.size_as_f64())
      .sum()
  }

  pub async fn get_volume(&self, market_id: &str) -> Option<MarketVolume> {
    let volumes = self.volumes.read().await;
    volumes.get(market_id).cloned()
  }
}
