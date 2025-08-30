use super::{builder::*, events::*, metrics::*, types::*};
use crate::candles::ring_buffer::{CandleRingBuffer, RingBufferStats};

#[derive(Debug, Clone, Default)]
pub struct CandleStoreStatistics {
  pub buffer_statistics: HashMap<String, HashMap<TimeFrame, RingBufferStats>>,
  pub active_builders: HashMap<String, usize>,
  pub total_memory_usage: usize,
  pub total_candles: u64,
  pub metrics_snapshot: MetricsSnapshot,
  pub config: CandleStoreConfig,
}
use chrono::{DateTime, Duration, Utc};
use parking_lot::Mutex;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;

/// Configuration for the candle store
#[derive(Debug, Clone)]
pub struct CandleStoreConfig {
  pub buffer_sizes: HashMap<TimeFrame, usize>,
  pub max_tick_buffer_size: usize,
  pub enable_quality_scoring: bool,
  pub enable_gap_detection: bool,
  pub enable_volatility_analysis: bool,
  pub auto_cleanup_interval_secs: u64,
  pub aggregation_enabled: bool,
}

impl Default for CandleStoreConfig {
  fn default() -> Self {
    let mut buffer_sizes = HashMap::new();

    // Conservative buffer sizes for production
    buffer_sizes.insert(TimeFrame::M1, 2880); // 48 hours
    buffer_sizes.insert(TimeFrame::M3, 1440); // 72 hours
    buffer_sizes.insert(TimeFrame::M5, 1728); // 144 hours (6 days)
    buffer_sizes.insert(TimeFrame::M15, 1344); // 336 hours (14 days)
    buffer_sizes.insert(TimeFrame::M30, 1440); // 720 hours (30 days)
    buffer_sizes.insert(TimeFrame::H1, 720); // 720 hours (30 days)
    buffer_sizes.insert(TimeFrame::H4, 360); // 1440 hours (60 days)
    buffer_sizes.insert(TimeFrame::D1, 365); // 365 days (1 year)
    buffer_sizes.insert(TimeFrame::W1, 104); // 104 weeks (2 years)
    buffer_sizes.insert(TimeFrame::MN1, 60); // 60 months (5 years)

    Self {
      buffer_sizes,
      max_tick_buffer_size: 10000,
      enable_quality_scoring: true,
      enable_gap_detection: true,
      enable_volatility_analysis: true,
      auto_cleanup_interval_secs: 3600, // 1 hour
      aggregation_enabled: true,
    }
  }
}

/// Main in-memory candle store
#[derive(Debug)]
pub struct CandleStore {
  // market_id -> timeframe -> ring buffer
  candles: Arc<RwLock<HashMap<String, HashMap<TimeFrame, CandleRingBuffer>>>>,

  // Active candle builders
  builders: Arc<Mutex<HashMap<String, HashMap<TimeFrame, CandleBuilder>>>>,

  // Configuration
  config: CandleStoreConfig,

  // Metrics
  metrics: Arc<CandleMetrics>,

  // Event publishers
  event_publishers: Vec<Arc<dyn CandleEventPublisher>>,
}

impl CandleStore {
  /// Create a new candle store with configuration
  pub fn new(config: CandleStoreConfig) -> Self {
    Self {
      candles: Arc::new(RwLock::new(HashMap::new())),
      builders: Arc::new(Mutex::new(HashMap::new())),
      config,
      metrics: Arc::new(CandleMetrics::new()),
      event_publishers: Vec::new(),
    }
  }

  /// Add an event publisher for candle events
  pub fn add_event_publisher(&mut self, publisher: Arc<dyn CandleEventPublisher>) {
    self.event_publishers.push(publisher);
  }

  /// Process a tick and potentially create candles
  pub async fn process_tick(&self, tick: &Tick) -> Result<Vec<Candle>, CandleError> {
    self.metrics.record_tick_received();
    let mut closed_candles = Vec::new();

    // Process for all relevant timeframes
    for timeframe in TimeFrame::trading_timeframes() {
      if let Some(closed_candle) = self.process_tick_for_timeframe(tick, timeframe).await? {
        closed_candles.push(closed_candle.clone());

        // Aggregate to higher timeframes if enabled
        if self.config.aggregation_enabled {
          let aggregated = self.aggregate_candle(&closed_candle).await?;
          closed_candles.extend(aggregated);
        }
      }
    }

    Ok(closed_candles)
  }

  /// Process tick for a specific timeframe
  async fn process_tick_for_timeframe(
    &self,
    tick: &Tick,
    timeframe: TimeFrame,
  ) -> Result<Option<Candle>, CandleError> {
    let candle_start = timeframe.round_timestamp(tick.timestamp);

    // Get or create builder and process tick
    let (closed_candle, needs_new_candle) = {
      let mut builders = self.builders.lock();
      let market_builders = builders
        .entry(tick.market_id.clone())
        .or_insert_with(HashMap::new);

      let builder = market_builders
        .entry(timeframe)
        .or_insert_with(|| CandleBuilder::new(tick.market_id.clone(), timeframe, candle_start));

      // Check if we need to close the current candle
      if builder.start_time != candle_start {
        // Close the previous candle
        let closed_candle = builder.clone().build(true, DataSource::WebSocketTick);
        (Some(closed_candle), true)
      } else {
        // Just add tick to current candle
        builder.add_tick(tick)?;
        (None, false)
      }
    };

    // Handle closed candle if any
    if let Some(closed_candle) = closed_candle {
      // Store in ring buffer
      self.store_candle(closed_candle.clone()).await;

      // Publish events
      self.publish_candle_closed_event(&closed_candle).await;

      // Update metrics
      self.metrics.record_candle_closed(timeframe);

      // Create new candle
      if needs_new_candle {
        let mut builders = self.builders.lock();
        let market_builders = builders
          .entry(tick.market_id.clone())
          .or_insert_with(HashMap::new);
        let builder = market_builders
          .entry(timeframe)
          .or_insert_with(|| CandleBuilder::new(tick.market_id.clone(), timeframe, candle_start));

        // Start new candle
        *builder = CandleBuilder::new(tick.market_id.clone(), timeframe, candle_start);

        // Add the tick to new candle
        builder.add_tick(tick)?;
      }

      return Ok(Some(closed_candle));
    }

    self.metrics.record_tick_processed();
    Ok(None)
  }

  /// Store a candle in the appropriate ring buffer
  async fn store_candle(&self, candle: Candle) {
    let buffer_size = self
      .config
      .buffer_sizes
      .get(&candle.timeframe)
      .copied()
      .unwrap_or(1000);

    let mut candles = self.candles.write().await;
    let market_candles = candles
      .entry(candle.market_id.clone())
      .or_insert_with(HashMap::new);

    let ring_buffer = market_candles
      .entry(candle.timeframe)
      .or_insert_with(|| CandleRingBuffer::new(buffer_size));

    ring_buffer.push(candle);
    self.metrics.record_candle_stored();
  }

  /// Publish candle closed event to all publishers
  async fn publish_candle_closed_event(&self, candle: &Candle) {
    let event = CandleClosedEvent {
      candle: candle.clone(),
      source_timeframe: None,
    };

    for publisher in &self.event_publishers {
      if let Err(e) = publisher.publish(&event).await {
        tracing::error!("Failed to publish candle closed event: {}", e);
      }
    }
  }

  /// Aggregate candle to higher timeframes
  pub async fn aggregate_candle(&self, source_candle: &Candle) -> Result<Vec<Candle>, CandleError> {
    let mut aggregated_candles = Vec::new();

    // Find parent timeframes to aggregate to
    let parent_timeframes = source_candle.timeframe.parent_timeframes();

    for target_timeframe in parent_timeframes {
      if let Some(aggregated) = self
        .aggregate_to_timeframe(source_candle, target_timeframe)
        .await?
      {
        aggregated_candles.push(aggregated);
      }
    }

    Ok(aggregated_candles)
  }

  /// Aggregate source candle to a specific target timeframe
  async fn aggregate_to_timeframe(
    &self,
    source_candle: &Candle,
    target_timeframe: TimeFrame,
  ) -> Result<Option<Candle>, CandleError> {
    let candle_start = target_timeframe.round_timestamp(source_candle.start_time);

    // Get or create builder and process candle
    let (closed_candle, needs_new_candle) = {
      let mut builders = self.builders.lock();
      let market_builders = builders
        .entry(source_candle.market_id.clone())
        .or_insert_with(HashMap::new);

      let builder = market_builders.entry(target_timeframe).or_insert_with(|| {
        CandleBuilder::new(
          source_candle.market_id.clone(),
          target_timeframe,
          candle_start,
        )
      });

      // Check if we need to close the current candle
      if builder.start_time != candle_start {
        // Close the previous candle
        let closed_candle = builder
          .clone()
          .build(true, DataSource::Aggregated(source_candle.timeframe));
        (Some(closed_candle), true)
      } else {
        // Just add source candle to current builder
        builder.add_candle(source_candle)?;
        (None, false)
      }
    };

    // Handle closed candle if any
    if let Some(closed_candle) = closed_candle {
      // Store aggregated candle
      self.store_candle(closed_candle.clone()).await;

      // Publish event
      self.publish_candle_closed_event(&closed_candle).await;

      // Create new candle
      if needs_new_candle {
        let mut builders = self.builders.lock();
        let market_builders = builders
          .entry(source_candle.market_id.clone())
          .or_insert_with(HashMap::new);
        let builder = market_builders.entry(target_timeframe).or_insert_with(|| {
          CandleBuilder::new(
            source_candle.market_id.clone(),
            target_timeframe,
            candle_start,
          )
        });

        // Start new candle
        *builder = CandleBuilder::new(
          source_candle.market_id.clone(),
          target_timeframe,
          candle_start,
        );

        // Add source candle to new builder
        builder.add_candle(source_candle)?;
      }

      return Ok(Some(closed_candle));
    }

    Ok(None)
  }

  /// Get latest N candles for a market and timeframe
  pub async fn get_candles(
    &self,
    market_id: &str,
    timeframe: TimeFrame,
    count: usize,
  ) -> Vec<Candle> {
    let candles = self.candles.read().await;

    if let Some(market_candles) = candles.get(market_id) {
      if let Some(ring_buffer) = market_candles.get(&timeframe) {
        return ring_buffer.get_latest(count).into_iter().cloned().collect();
      }
    }

    Vec::new()
  }

  /// Get candles within a time range
  pub async fn get_candles_range(
    &self,
    market_id: &str,
    timeframe: TimeFrame,
    start: DateTime<Utc>,
    end: DateTime<Utc>,
  ) -> Vec<Candle> {
    let candles = self.candles.read().await;

    if let Some(market_candles) = candles.get(market_id) {
      if let Some(ring_buffer) = market_candles.get(&timeframe) {
        return ring_buffer
          .get_range(start, end)
          .into_iter()
          .cloned()
          .collect();
      }
    }

    Vec::new()
  }

  /// Get the most recent closed candle
  pub async fn get_latest_candle(&self, market_id: &str, timeframe: TimeFrame) -> Option<Candle> {
    self
      .get_candles(market_id, timeframe, 1)
      .await
      .into_iter()
      .next()
  }

  /// Get the current (potentially incomplete) candle being built
  pub async fn get_current_candle(&self, market_id: &str, timeframe: TimeFrame) -> Option<Candle> {
    let builders = self.builders.lock();

    if let Some(market_builders) = builders.get(market_id) {
      if let Some(builder) = market_builders.get(&timeframe) {
        return Some(builder.clone().build(false, DataSource::WebSocketTick));
      }
    }

    None
  }

  /// Get comprehensive statistics about the store
  pub async fn get_store_statistics(&self) -> CandleStoreStatistics {
    let candles = self.candles.read().await;
    let builders = self.builders.lock();

    let mut stats = CandleStoreStatistics::default();

    // Count candles by market and timeframe
    for (market_id, market_candles) in candles.iter() {
      let mut market_stats = HashMap::new();
      for (timeframe, ring_buffer) in market_candles.iter() {
        let buffer_stats = ring_buffer.statistics();
        market_stats.insert(*timeframe, buffer_stats);

        stats.total_memory_usage += ring_buffer.memory_usage();
        stats.total_candles += ring_buffer.total_written();
      }
      stats
        .buffer_statistics
        .insert(market_id.clone(), market_stats);
    }

    // Count active builders
    for (market_id, market_builders) in builders.iter() {
      stats
        .active_builders
        .insert(market_id.clone(), market_builders.len());
    }

    stats.metrics_snapshot = self.metrics.get_snapshot();
    stats.config = self.config.clone();
    stats
  }

  /// Clean up old data and perform maintenance
  pub async fn cleanup_old_data(&self) -> usize {
    let mut cleaned = 0;

    // Ring buffers handle their own size limits automatically
    // Additional cleanup logic could be added here for specific needs

    tracing::info!("Cleanup completed, processed {} items", cleaned);
    cleaned
  }

  /// Force close all current candles (useful for shutdown)
  pub async fn close_all_current_candles(&self) -> Vec<Candle> {
    let mut closed_candles = Vec::new();
    let mut builders = self.builders.lock();

    for (market_id, market_builders) in builders.iter_mut() {
      for (timeframe, builder) in market_builders.iter_mut() {
        if !builder.is_empty() {
          let closed_candle = builder.clone().build(true, DataSource::WebSocketTick);
          closed_candles.push(closed_candle.clone());

          // Store the closed candle
          // Store and publish events without dropping lock
          let candle_clone = closed_candle.clone();
          self.store_candle(candle_clone.clone()).await;
          self.publish_candle_closed_event(&candle_clone).await;
        }
      }
    }

    // Clear all builders
    builders.clear();

    closed_candles
  }

  /// Get metrics instance
  pub fn get_metrics(&self) -> Arc<CandleMetrics> {
    self.metrics.clone()
  }
}
