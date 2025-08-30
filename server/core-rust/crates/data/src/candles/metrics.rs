use super::types::TimeFrame;
use prometheus::{IntCounter, IntCounterVec, Opts, Registry};

#[derive(Debug)]
pub struct CandleMetrics {
  registry: Registry,
  ticks_received: IntCounter,
  ticks_processed: IntCounter,
  candles_closed: IntCounterVec,
  candles_stored: IntCounter,
}

impl CandleMetrics {
  pub fn new() -> Self {
    let registry = Registry::new();

    let ticks_received =
      IntCounter::new("candles_ticks_received_total", "Total ticks received").unwrap();
    let ticks_processed =
      IntCounter::new("candles_ticks_processed_total", "Total ticks processed").unwrap();
    let candles_closed = IntCounterVec::new(
      Opts::new("candles_closed_total", "Total candles closed by timeframe"),
      &["timeframe"],
    )
    .unwrap();
    let candles_stored = IntCounter::new("candles_stored_total", "Total candles stored").unwrap();

    registry.register(Box::new(ticks_received.clone())).unwrap();
    registry
      .register(Box::new(ticks_processed.clone()))
      .unwrap();
    registry.register(Box::new(candles_closed.clone())).unwrap();
    registry.register(Box::new(candles_stored.clone())).unwrap();

    Self {
      registry,
      ticks_received,
      ticks_processed,
      candles_closed,
      candles_stored,
    }
  }

  pub fn record_tick_received(&self) {
    self.ticks_received.inc();
  }

  pub fn record_tick_processed(&self) {
    self.ticks_processed.inc();
  }

  pub fn record_candle_closed(&self, timeframe: TimeFrame) {
    self
      .candles_closed
      .with_label_values(&[&timeframe.to_string()])
      .inc();
  }

  pub fn record_candle_stored(&self) {
    self.candles_stored.inc();
  }

  pub fn get_snapshot(&self) -> MetricsSnapshot {
    MetricsSnapshot {
      ticks_received: self.ticks_received.get(),
      ticks_processed: self.ticks_processed.get(),
      candles_stored: self.candles_stored.get(),
    }
  }
}

#[derive(Debug, Clone, Default)]
pub struct MetricsSnapshot {
  pub ticks_received: u64,
  pub ticks_processed: u64,
  pub candles_stored: u64,
}
