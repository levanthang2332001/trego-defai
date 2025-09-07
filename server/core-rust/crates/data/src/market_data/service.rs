use super::{
  orderbook::OrderbookStore,
  trades::TradeStore,
  types::{OrderbookLevel, Trade, WsResponse},
};
use crate::candles::{
  store::CandleStore,
  types::{Tick, TradeSide},
};
use std::sync::Arc;

#[derive(Debug)]
pub struct MarketDataService {
  orderbook_store: Arc<OrderbookStore>,
  trade_store: Arc<TradeStore>,
  candle_store: Arc<CandleStore>,
}

impl MarketDataService {
  pub fn new(candle_store: Arc<CandleStore>) -> Self {
    Self {
      orderbook_store: Arc::new(OrderbookStore::new()),
      trade_store: Arc::new(TradeStore::new()),
      candle_store,
    }
  }

  pub async fn process_orderbook(
    &self,
    market_id: &str,
    levels: Vec<OrderbookLevel>,
  ) -> Option<(f64, f64, f64)> {
    // Split into bids and asks
    let (asks, bids): (Vec<_>, Vec<_>) = levels.into_iter().partition(|level| level.is_ask);

    // Create orderbook
    let orderbook = super::types::Orderbook {
      market_id: market_id.to_string(),
      bids,
      asks,
    };

    // Update orderbook store
    self.orderbook_store.update_orderbook(orderbook).await;

    // Create and process ticks for candles
    let timestamp = chrono::Utc::now();

    // Get best bid/ask
    let best_bid = self.orderbook_store.get_best_bid(market_id).await;
    let best_ask = self.orderbook_store.get_best_ask(market_id).await;

    if let (Some(bid), Some(ask)) = (best_bid, best_ask) {
      // Create tick from bid
      let tick_bid = Tick {
        timestamp,
        market_id: market_id.to_string(),
        price: bid.price,
        volume: bid.size_as_f64(),
        bid: Some(bid.price),
        ask: Some(ask.price),
        spread: Some((ask.price - bid.price) / bid.price),
        side: Some(TradeSide::Sell),
        sequence: None,
      };

      // Create tick from ask
      let tick_ask = Tick {
        timestamp,
        market_id: market_id.to_string(),
        price: ask.price,
        volume: ask.size_as_f64(),
        bid: Some(bid.price),
        ask: Some(ask.price),
        spread: Some((ask.price - bid.price) / bid.price),
        side: Some(TradeSide::Buy),
        sequence: None,
      };

      // Process both ticks
      if let Err(e) = self.candle_store.process_tick(&tick_bid).await {
        tracing::error!("Failed to process bid tick: {}", e);
      }
      if let Err(e) = self.candle_store.process_tick(&tick_ask).await {
        tracing::error!("Failed to process ask tick: {}", e);
      }

      // Calculate volume from orderbook
      let total_volume = self.orderbook_store.calculate_volume(market_id).await;

      // Return bid, ask, volume for main state update
      return Some((bid.price, ask.price, total_volume));
    }

    None
  }

  pub async fn process_trade(&self, trade: Trade) {
    // Update trade store
    self.trade_store.add_trade(trade.clone()).await;

    // Create and process tick
    let tick = Tick {
      timestamp: chrono::DateTime::from_timestamp(trade.timestamp, 0)
        .unwrap()
        .into(),
      market_id: trade.market_id.clone(),
      price: trade.price_as_f64(),
      volume: trade.size_as_f64(),
      bid: None,
      ask: None,
      spread: None,
      side: Some(match trade.order_type {
        3 | 5 => TradeSide::Buy,  // Market/Limit Buy
        4 | 6 => TradeSide::Sell, // Market/Limit Sell
        _ => TradeSide::Unknown,
      }),
      sequence: None,
    };

    if let Err(e) = self.candle_store.process_tick(&tick).await {
      tracing::error!("Failed to process trade tick: {}", e);
    }
  }

  pub async fn get_best_bid(&self, market_id: &str) -> Option<OrderbookLevel> {
    self.orderbook_store.get_best_bid(market_id).await
  }

  pub async fn get_best_ask(&self, market_id: &str) -> Option<OrderbookLevel> {
    self.orderbook_store.get_best_ask(market_id).await
  }

  pub async fn get_volume(&self, market_id: &str) -> f64 {
    self.orderbook_store.calculate_volume(market_id).await
  }

  pub async fn get_volume_24h(&self, market_id: &str) -> f64 {
    self
      .trade_store
      .get_volume(market_id)
      .await
      .map(|v| v.volume_24h)
      .unwrap_or(0.0)
  }

  pub async fn handle_ws_message(&self, message: String) -> Result<(), Box<dyn std::error::Error>> {
    // Parse message
    let response: WsResponse<serde_json::Value> = serde_json::from_str(&message)?;

    match response.message.as_ref() {
      "orderbook" => {
        // Parse orderbook data
        let levels: Vec<OrderbookLevel> = serde_json::from_value(response.data)?;
        if let Some(first) = levels.first() {
          let market_id = first.market_id.clone();
          self.process_orderbook(&market_id, levels).await;
        }
      }
      "recent_trades" => {
        // Parse trades data
        let trades: Vec<Trade> = serde_json::from_value(response.data)?;
        tracing::info!("Received {} trades from WebSocket", trades.len());

        for (i, trade) in trades.iter().enumerate() {
          tracing::info!(
            "Processing trade {}/{}: market_id={}, price={}, size={}",
            i + 1,
            trades.len(),
            trade.market_id,
            trade.price,
            trade.size
          );
          match std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            tokio::task::block_in_place(|| {
              tokio::runtime::Handle::current().block_on(async {
                self.process_trade(trade.clone()).await;
              })
            })
          })) {
            Ok(_) => tracing::debug!("Trade {} processed successfully", i + 1),
            Err(e) => tracing::error!("Failed to process trade {}: {:?}", i + 1, e),
          }
        }
      }
      _ => {
        tracing::warn!("Unknown message type: {}", response.message);
      }
    }

    Ok(())
  }
}
