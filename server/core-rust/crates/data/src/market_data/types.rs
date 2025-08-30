use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Orderbook {
  pub market_id: String,
  pub bids: Vec<OrderbookLevel>,
  pub asks: Vec<OrderbookLevel>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderbookLevel {
  pub is_ask: bool,
  pub last_updated: i64,
  pub market_id: String,
  pub price: f64,
  pub size: String, // Size is string in API response
  pub transaction_version: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trade {
  pub address: String,
  pub entry_price: Option<String>, // Can be null
  pub fee: String,
  pub last_updated: i64,
  pub leverage: i64,
  pub market_id: String,
  pub order_id: Option<String>, // Can be null
  pub order_type: i32,
  pub order_value: String,
  pub pnl: String,
  pub price: String,
  pub size: String,
  pub timestamp: i64,
  pub trade_id: String,
  pub transaction_version: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketVolume {
  pub market_id: String,
  pub volume_1m: f64,
  pub volume_5m: f64,
  pub volume_15m: f64,
  pub volume_1h: f64,
  pub volume_24h: f64,
  pub last_update: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WsTopics {
  Orderbook,
  RecentTrades,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsRequest {
  pub topic: WsTopics,
  pub market_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsResponse<T> {
  pub data: T,
  pub message: String,
}

// Helper functions to convert string to f64
impl OrderbookLevel {
  pub fn size_as_f64(&self) -> f64 {
    self.size.parse::<f64>().unwrap_or(0.0)
  }
}

impl Trade {
  pub fn size_as_f64(&self) -> f64 {
    self.size.parse::<f64>().unwrap_or(0.0)
  }

  pub fn price_as_f64(&self) -> f64 {
    self.price.parse::<f64>().unwrap_or(0.0)
  }

  pub fn value_as_f64(&self) -> f64 {
    self.order_value.parse::<f64>().unwrap_or(0.0)
  }
}

// Constants for order types
pub const ORDER_TYPE_MARKET_BUY: i32 = 3;
pub const ORDER_TYPE_MARKET_SELL: i32 = 4;
pub const ORDER_TYPE_LIMIT_BUY: i32 = 5;
pub const ORDER_TYPE_LIMIT_SELL: i32 = 6;
