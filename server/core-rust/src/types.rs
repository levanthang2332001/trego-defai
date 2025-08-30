use rust_decimal::Decimal;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Side {
  Buy,
  Sell,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OrderType {
  Market,
  Limit,
  StopMarket,
  StopLimit,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum OrderStatus {
  New,
  PartiallyFilled,
  Filled,
  Canceled,
  Rejected,
  Expired,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
  pub id: String,
  pub side: Side,
  pub order_type: OrderType,
  pub status: OrderStatus,
  pub price: Option<Decimal>,
  pub quantity: Decimal,
  pub filled_quantity: Decimal,
  pub remaining_quantity: Decimal,
  pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum WsTopics {
  OrderHistory,
  DepositWithdrawHistory,
  TradeHistory,
  Positions,
  OpenOrders,
  Orderbook,
  RecentTrades,
  LiveFundingRate,
  LiveOrderHistory,
  LiveTradeHistory,
  BestPrice,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsRequest {
  pub topic: WsTopics,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub address: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub market_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsResponse<T> {
  pub data: T,
  pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Position {
  pub market_id: String,
  pub size: Decimal,
  pub entry_price: Decimal,
  pub liquidation_price: Option<Decimal>,
  pub unrealized_pnl: Decimal,
  pub leverage: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderbookLevel {
  pub price: Decimal,
  pub quantity: Decimal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Orderbook {
  pub market_id: String,
  pub bids: Vec<OrderbookLevel>,
  pub asks: Vec<OrderbookLevel>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Trade {
  pub market_id: String,
  pub price: Decimal,
  pub quantity: Decimal,
  pub side: Side,
  pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FundingRate {
  pub market_id: String,
  pub rate: Decimal,
  pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BestPrice {
  pub market_id: String,
  pub best_bid: Option<f64>,
  pub best_ask: Option<f64>,
}
