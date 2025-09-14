// crates/data/src/candles/builder.rs
//! Candle building and aggregation logic

use super::types::*;
use chrono::{DateTime, Duration, Utc};
use std::collections::VecDeque;

/// Builds candles from ticks or aggregates from lower timeframes
#[derive(Debug, Clone)]
pub struct CandleBuilder {
  pub market_id: String,
  pub timeframe: TimeFrame,
  pub start_time: DateTime<Utc>,
  pub open: Option<f64>,
  pub high: f64,
  pub low: f64,
  pub close: f64,
  pub volume: f64,
  pub tick_count: u64,
  pub volume_price_sum: f64,
  pub spread_sum: f64,
  pub spread_count: u64,
  pub spread_min: f64,
  pub spread_max: f64,
  pub ticks_buffer: VecDeque<Tick>, // Keep recent ticks for quality analysis
  pub created_at: DateTime<Utc>,
  pub last_update: DateTime<Utc>,
}

impl CandleBuilder {
  /// Create a new candle builder for a specific market and timeframe
  pub fn new(market_id: String, timeframe: TimeFrame, start_time: DateTime<Utc>) -> Self {
    Self {
      market_id,
      timeframe,
      start_time,
      open: None,
      high: f64::NEG_INFINITY,
      low: f64::INFINITY,
      close: 0.0,
      volume: 0.0,
      tick_count: 0,
      volume_price_sum: 0.0,
      spread_sum: 0.0,
      spread_count: 0,
      spread_min: f64::INFINITY,
      spread_max: f64::NEG_INFINITY,
      ticks_buffer: VecDeque::with_capacity(1000),
      created_at: Utc::now(),
      last_update: start_time,
    }
  }

  /// Add a tick to this candle
  pub fn add_tick(&mut self, tick: &Tick) -> Result<(), CandleError> {
    // Validation
    if tick.price <= 0.0 {
      return Err(CandleError::InvalidPrice(tick.price));
    }

    if tick.volume < 0.0 {
      return Err(CandleError::InvalidVolume(tick.volume));
    }

    // Check if tick belongs to this candle period
    let tick_period_start = self.timeframe.round_timestamp(tick.timestamp);
    if tick_period_start != self.start_time {
      return Err(CandleError::TickOutsidePeriod {
        tick_time: tick.timestamp,
        period_start: self.start_time,
        period_end: self.start_time + Duration::seconds(self.timeframe.duration_secs()),
      });
    }

    // Set open price if first tick
    if self.open.is_none() {
      self.open = Some(tick.price);
    }

    // Update OHLC
    self.high = self.high.max(tick.price);
    self.low = self.low.min(tick.price);
    self.close = tick.price;

    // Update volume and VWAP components
    self.volume += tick.volume;
    self.volume_price_sum += tick.price * tick.volume;
    self.tick_count += 1;

    // Update spread statistics
    if let Some(spread) = tick.spread {
      if spread >= 0.0 {
        self.spread_sum += spread;
        self.spread_count += 1;
        self.spread_min = self.spread_min.min(spread);
        self.spread_max = self.spread_max.max(spread);
      }
    }

    // Keep recent ticks for analysis (with size limit)
    self.ticks_buffer.push_back(tick.clone());
    if self.ticks_buffer.len() > 1000 {
      self.ticks_buffer.pop_front();
    }

    self.last_update = tick.timestamp.max(self.last_update);
    Ok(())
  }

  /// Add a candle from a lower timeframe (for aggregation)
  pub fn add_candle(&mut self, candle: &Candle) -> Result<(), CandleError> {
    // Validation for candle aggregation
    if candle.open <= 0.0 || candle.high <= 0.0 || candle.low <= 0.0 || candle.close <= 0.0 {
      return Err(CandleError::InvalidCandleData(
        "Invalid OHLC values".to_string(),
      ));
    }

    // Set open if first candle
    if self.open.is_none() {
      self.open = Some(candle.open);
    }

    // Update OHLC
    self.high = self.high.max(candle.high);
    self.low = self.low.min(candle.low);
    self.close = candle.close;

    // Aggregate volume and tick count
    self.volume += candle.volume;
    self.tick_count += candle.tick_count;
    self.volume_price_sum += candle.vwap * candle.volume;

    // Aggregate spread statistics
    if candle.tick_count > 0 {
      self.spread_sum += candle.spread_avg * candle.tick_count as f64;
      self.spread_count += candle.tick_count;

      if candle.spread_min < self.spread_min {
        self.spread_min = candle.spread_min;
      }
      if candle.spread_max > self.spread_max {
        self.spread_max = candle.spread_max;
      }
    }

    self.last_update = candle.end_time.max(self.last_update);
    Ok(())
  }

  /// Build the final candle
  pub fn build(self, is_closed: bool, source: DataSource) -> Candle {
    let end_time = self.start_time + Duration::seconds(self.timeframe.duration_secs());

    let vwap = if self.volume > 0.0 {
      self.volume_price_sum / self.volume
    } else {
      self.close
    };

    let spread_avg = if self.spread_count > 0 {
      self.spread_sum / self.spread_count as f64
    } else {
      0.0
    };

    let spread_min = if self.spread_min == f64::INFINITY {
      0.0
    } else {
      self.spread_min
    };
    let spread_max = if self.spread_max == f64::NEG_INFINITY {
      0.0
    } else {
      self.spread_max
    };

    // Calculate quality score
    let quality_score = self.calculate_quality_score();

    // Gap detection
    let gap_detected = self.detect_price_gaps();

    // Calculate volatility Z-score
    let volatility_z_score = self.calculate_volatility_z_score();

    let metadata = CandleMetadata {
      created_timestamp: self.created_at.timestamp(),
      created_at: self.created_at,
      source,
      quality_score,
      gap_detected,
      volatility_z_score,
      ws_sequence: None,
    };

    Candle {
      market_id: self.market_id,
      timeframe: self.timeframe,
      start_timestamp: self.start_time.timestamp(),
      end_timestamp: end_time.timestamp(),
      start_time: self.start_time,
      end_time,
      open: self.open.unwrap_or(self.close),
      high: if self.high == f64::NEG_INFINITY {
        self.close
      } else {
        self.high
      },
      low: if self.low == f64::INFINITY {
        self.close
      } else {
        self.low
      },
      close: self.close,
      volume: self.volume,
      tick_count: self.tick_count,
      vwap,
      spread_avg,
      spread_min,
      spread_max,
      is_closed,
      metadata,
    }
  }

  /// Calculate quality score based on various factors
  fn calculate_quality_score(&self) -> f64 {
    let mut score: f64 = 1.0;

    // Reduce score for insufficient tick count
    if self.tick_count < 5 {
      score *= 0.5;
    }

    // Reduce score for zero volume
    if self.volume == 0.0 {
      score *= 0.3;
    }

    // Reduce score for suspicious price movements
    if let Some(open) = self.open {
      let price_change = (self.close - open).abs() / open;
      if price_change > 0.1 {
        // More than 10% change
        score *= 0.8;
      }
    }

    // Reduce score for wide spreads
    let avg_spread_pct = if self.spread_count > 0 && self.close > 0.0 {
      (self.spread_sum / self.spread_count as f64) / self.close
    } else {
      0.0
    };

    if avg_spread_pct > 0.01 {
      // More than 1% spread
      score *= 0.9;
    }

    score.max(0.0).min(1.0)
  }

  /// Detect significant price gaps in tick data
  fn detect_price_gaps(&self) -> bool {
    if self.ticks_buffer.len() < 2 {
      return false;
    }

    // Look for significant gaps between consecutive ticks
    for window in self.ticks_buffer.iter().collect::<Vec<_>>().windows(2) {
      let price_diff = (window[1].price - window[0].price).abs();
      let price_change_pct = price_diff / window[0].price;

      if price_change_pct > 0.02 {
        // More than 2% jump
        return true;
      }
    }

    false
  }

  /// Calculate volatility Z-score for anomaly detection
  fn calculate_volatility_z_score(&self) -> Option<f64> {
    if self.ticks_buffer.len() < 10 {
      return None;
    }

    let prices: Vec<f64> = self.ticks_buffer.iter().map(|t| t.price).collect();
    let returns: Vec<f64> = prices.windows(2).map(|w| (w[1] - w[0]) / w[0]).collect();

    if returns.is_empty() {
      return None;
    }

    let mean_return = returns.iter().sum::<f64>() / returns.len() as f64;
    let variance = returns
      .iter()
      .map(|r| (r - mean_return).powi(2))
      .sum::<f64>()
      / returns.len() as f64;

    let std_dev = variance.sqrt();

    if std_dev > 0.0 {
      let current_return =
        (self.close - self.open.unwrap_or(self.close)) / self.open.unwrap_or(self.close);
      Some((current_return - mean_return) / std_dev)
    } else {
      None
    }
  }

  /// Check if the builder has any data
  pub fn is_empty(&self) -> bool {
    self.tick_count == 0
  }

  /// Get the current progress of this candle (0.0 to 1.0)
  pub fn progress(&self) -> f64 {
    if self.timeframe.duration_secs() == 0 {
      return 1.0;
    }

    let elapsed = (self.last_update - self.start_time).num_seconds();
    let total = self.timeframe.duration_secs();
    (elapsed as f64 / total as f64).min(1.0).max(0.0)
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_candle_builder_creation() {
    let builder = CandleBuilder::new(
      "BTC-USD".to_string(),
      TimeFrame::M1,
      Utc::now()
        .with_second(0)
        .unwrap()
        .with_nanosecond(0)
        .unwrap(),
    );

    assert_eq!(builder.market_id, "BTC-USD");
    assert_eq!(builder.timeframe, TimeFrame::M1);
    assert!(builder.is_empty());
  }

  #[test]
  fn test_add_tick() {
    let mut builder = CandleBuilder::new(
      "BTC-USD".to_string(),
      TimeFrame::M1,
      Utc::now()
        .with_second(0)
        .unwrap()
        .with_nanosecond(0)
        .unwrap(),
    );

    let tick = Tick {
      timestamp: builder.start_time,
      market_id: "BTC-USD".to_string(),
      price: 50000.0,
      volume: 1.0,
      bid: Some(49999.0),
      ask: Some(50001.0),
      spread: Some(2.0),
      side: None,
      sequence: None,
    };

    assert!(builder.add_tick(&tick).is_ok());
    assert!(!builder.is_empty());
    assert_eq!(builder.open, Some(50000.0));
    assert_eq!(builder.close, 50000.0);
  }

  #[test]
  fn test_invalid_price() {
    let mut builder = CandleBuilder::new(
      "BTC-USD".to_string(),
      TimeFrame::M1,
      Utc::now()
        .with_second(0)
        .unwrap()
        .with_nanosecond(0)
        .unwrap(),
    );

    let tick = Tick {
      timestamp: builder.start_time,
      market_id: "BTC-USD".to_string(),
      price: -1.0, // Invalid negative price
      volume: 1.0,
      bid: None,
      ask: None,
      spread: None,
      side: None,
      sequence: None,
    };

    assert!(matches!(
      builder.add_tick(&tick),
      Err(CandleError::InvalidPrice(_))
    ));
  }

  #[test]
  fn test_build_candle() {
    let mut builder = CandleBuilder::new(
      "BTC-USD".to_string(),
      TimeFrame::M1,
      Utc::now()
        .with_second(0)
        .unwrap()
        .with_nanosecond(0)
        .unwrap(),
    );

    let tick1 = Tick {
      timestamp: builder.start_time,
      market_id: "BTC-USD".to_string(),
      price: 50000.0,
      volume: 1.0,
      bid: None,
      ask: None,
      spread: None,
      side: None,
      sequence: None,
    };

    let tick2 = Tick {
      timestamp: builder.start_time + Duration::seconds(30),
      market_id: "BTC-USD".to_string(),
      price: 50100.0,
      volume: 2.0,
      bid: None,
      ask: None,
      spread: None,
      side: None,
      sequence: None,
    };

    builder.add_tick(&tick1).unwrap();
    builder.add_tick(&tick2).unwrap();

    let candle = builder.build(true, DataSource::WebSocketTick);

    assert_eq!(candle.open, 50000.0);
    assert_eq!(candle.high, 50100.0);
    assert_eq!(candle.low, 50000.0);
    assert_eq!(candle.close, 50100.0);
    assert_eq!(candle.volume, 3.0);
    assert_eq!(candle.tick_count, 2);
    assert!(candle.is_closed);
  }
}
