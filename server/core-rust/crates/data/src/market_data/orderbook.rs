use super::types::{Orderbook, OrderbookLevel, WsRequest, WsTopics};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

#[derive(Debug, Clone)]
pub struct OrderbookStore {
  // market_id -> orderbook
  orderbooks: Arc<RwLock<HashMap<String, Orderbook>>>,
}

impl OrderbookStore {
  pub fn new() -> Self {
    Self {
      orderbooks: Arc::new(RwLock::new(HashMap::new())),
    }
  }

  pub fn get_subscription_request(market_id: &str) -> WsRequest {
    WsRequest {
      topic: WsTopics::Orderbook,
      market_id: market_id.to_string(),
    }
  }

  pub async fn update_orderbook(&self, orderbook: Orderbook) {
    let mut orderbooks = self.orderbooks.write().await;
    orderbooks.insert(orderbook.market_id.clone(), orderbook);
  }

  pub async fn get_orderbook(&self, market_id: &str) -> Option<Orderbook> {
    let orderbooks = self.orderbooks.read().await;
    orderbooks.get(market_id).cloned()
  }

  pub async fn get_best_bid(&self, market_id: &str) -> Option<OrderbookLevel> {
    let orderbooks = self.orderbooks.read().await;
    orderbooks
      .get(market_id)
      .and_then(|ob| {
        ob.bids
          .iter()
          .max_by(|a, b| a.price.partial_cmp(&b.price).unwrap())
      })
      .cloned()
  }

  pub async fn get_best_ask(&self, market_id: &str) -> Option<OrderbookLevel> {
    let orderbooks = self.orderbooks.read().await;
    orderbooks
      .get(market_id)
      .and_then(|ob| {
        ob.asks
          .iter()
          .min_by(|a, b| a.price.partial_cmp(&b.price).unwrap())
      })
      .cloned()
  }

  pub async fn calculate_volume(&self, market_id: &str) -> f64 {
    let orderbooks = self.orderbooks.read().await;
    if let Some(orderbook) = orderbooks.get(market_id) {
      // Calculate total volume from both sides
      let bid_volume: f64 = orderbook.bids.iter().map(|level| level.size_as_f64()).sum();
      let ask_volume: f64 = orderbook.asks.iter().map(|level| level.size_as_f64()).sum();
      bid_volume + ask_volume
    } else {
      0.0
    }
  }
}
