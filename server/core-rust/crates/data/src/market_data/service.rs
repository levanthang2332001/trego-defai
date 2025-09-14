use super::{
  orderbook::OrderbookStore,
  trades::TradeStore,
  types::{OrderbookLevel, Trade, WsResponse},
};
use crate::candles::{
  database::CandleDatabase,
  store::CandleStore,
  types::{Tick, TradeSide, WebSocketCandle},
};
use sqlx::Row;
use std::sync::Arc;

#[derive(Debug)]
pub struct MarketDataService {
  orderbook_store: Arc<OrderbookStore>,
  trade_store: Arc<TradeStore>,
  candle_store: Arc<CandleStore>,
  database: Option<Arc<CandleDatabase>>,
}

impl MarketDataService {
  pub fn new(candle_store: Arc<CandleStore>) -> Self {
    Self {
      orderbook_store: Arc::new(OrderbookStore::new()),
      trade_store: Arc::new(TradeStore::new()),
      candle_store,
      database: None,
    }
  }

  pub fn new_with_database(candle_store: Arc<CandleStore>, database: Arc<CandleDatabase>) -> Self {
    Self {
      orderbook_store: Arc::new(OrderbookStore::new()),
      trade_store: Arc::new(TradeStore::new()),
      candle_store,
      database: Some(database),
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

    // Save as WebSocket candle directly to database (primary method)
    if let Some(database) = &self.database {
      self.save_trade_as_websocket_candle(database, &trade).await;
    }

    // Also process with old tick system for backward compatibility
    let datetime = chrono::DateTime::from_timestamp(trade.timestamp, 0).unwrap_or_default();
    let tick = Tick {
      timestamp: datetime,
      market_id: trade.market_id.clone(),
      price: trade.price_as_f64(),
      volume: trade.size_as_f64(),
      bid: None,
      ask: None,
      spread: None,
      side: Some(match trade.order_type {
        3 | 5 => TradeSide::Buy,
        4 | 6 => TradeSide::Sell,
        _ => TradeSide::Unknown,
      }),
      sequence: None,
    };

    if let Err(e) = self.candle_store.process_tick(&tick).await {
      tracing::error!("Failed to process trade tick: {}", e);
    }
  }

  /// Convert trade to WebSocket candle and save directly to database
  async fn save_trade_as_websocket_candle(&self, database: &CandleDatabase, trade: &Trade) {
    // Round timestamp to 1-minute intervals for M1 candles
    let minute_timestamp = (trade.timestamp / 60) * 60;

    // Try to get existing candle for this minute
    let existing_candle = sqlx::query_scalar::<_, Option<i64>>(
      "SELECT id FROM ws_candles WHERE market_id = $1 AND timeframe = '1m' AND timestamp_start = $2"
    )
    .bind(&trade.market_id)
    .bind(minute_timestamp)
    .fetch_optional(database.pool())
    .await;

    match existing_candle {
      Ok(Some(_)) => {
        // Update existing candle with new trade data
        if let Err(e) = sqlx::query(
          r#"
          UPDATE ws_candles SET
            high_price = GREATEST(high_price, $3),
            low_price = LEAST(low_price, $3),
            close_price = $3,
            volume = volume + $4,
            trade_count = trade_count + 1,
            timestamp_end = $5
          WHERE market_id = $1 AND timeframe = '1m' AND timestamp_start = $2
          "#,
        )
        .bind(&trade.market_id)
        .bind(minute_timestamp)
        .bind(trade.price_as_f64())
        .bind(trade.size_as_f64())
        .bind(trade.timestamp)
        .execute(database.pool())
        .await
        {
          tracing::error!("Failed to update WebSocket candle: {}", e);
        } else {
          tracing::debug!(
            "Updated WebSocket M1 candle for market {} at timestamp {}",
            trade.market_id,
            minute_timestamp
          );
        }
      }
      Ok(None) => {
        // Create new WebSocket candle
        let ws_candle = WebSocketCandle::from_websocket_data(
          trade.market_id.clone(),
          "1m".to_string(),
          minute_timestamp,
          trade.price_as_f64(), // open = first trade price
          trade.price_as_f64(), // high = first trade price
          trade.price_as_f64(), // low = first trade price
          trade.price_as_f64(), // close = first trade price
          trade.size_as_f64(),  // volume = first trade size
          Some(1),              // trade_count = 1
          None,                 // sequence from trade if available
        );

        if let Err(e) = database.save_websocket_candle(&ws_candle).await {
          tracing::error!("Failed to save new WebSocket candle: {}", e);
        } else {
          tracing::info!(
            "💾 Created new WebSocket M1 candle for {} at timestamp {}",
            trade.market_id,
            minute_timestamp
          );
        }
      }
      Err(e) => {
        tracing::error!("Failed to check existing WebSocket candle: {}", e);
      }
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
