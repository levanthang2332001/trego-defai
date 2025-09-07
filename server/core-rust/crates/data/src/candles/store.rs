use super::{builder::*, events::*, metrics::*, types::*};
use crate::candles::ring_buffer::{CandleRingBuffer, RingBufferStats};
use tracing::info;

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

    // Only process for M1 timeframe to avoid double counting
    if let Some(closed_candle) = self.process_tick_for_timeframe(tick, TimeFrame::M1).await? {
      closed_candles.push(closed_candle.clone());

      // Aggregate to higher timeframes if enabled
      if self.config.aggregation_enabled {
        tracing::info!(
          "Aggregating M1 candle: start={}, volume={}, ticks={}",
          closed_candle.start_time.timestamp(),
          closed_candle.volume,
          closed_candle.tick_count
        );
        let aggregated = self.aggregate_candle(&closed_candle).await?;
        for agg_candle in &aggregated {
          tracing::info!(
            "Created aggregated candle: timeframe={:?}, start={}, volume={}, ticks={}",
            agg_candle.timeframe,
            agg_candle.start_time.timestamp(),
            agg_candle.volume,
            agg_candle.tick_count
          );
          // Store each aggregated candle immediately
          self.store_candle(agg_candle.clone()).await;
          self.publish_candle_closed_event(agg_candle).await;
        }
        closed_candles.extend(aggregated);
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
    info!(
      "STORING candle: market={}, timeframe={:?}, start={}, volume={}, ticks={}",
      candle.market_id,
      candle.timeframe,
      candle.start_time.format("%H:%M:%S"),
      candle.volume,
      candle.tick_count
    );

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

    // Check if this exact candle is already stored to prevent duplicates
    let latest_candles = ring_buffer.get_latest(1);
    if let Some(existing_candle) = latest_candles.first() {
      if existing_candle.start_time == candle.start_time &&
         existing_candle.timeframe == candle.timeframe &&
         existing_candle.market_id == candle.market_id {
        info!("Candle already exists in ring buffer, skipping duplicate storage for {:?} at {}",
          candle.timeframe, candle.start_time.format("%H:%M:%S"));
        return;
      }
    }

    ring_buffer.push(candle.clone());
    self.metrics.record_candle_stored();

    info!("Successfully stored candle in ring buffer for {:?}", candle.timeframe);
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

  /// Aggregate candle to higher timeframes (single parent chain + independent chains)
  pub async fn aggregate_candle(&self, source_candle: &Candle) -> Result<Vec<Candle>, CandleError> {
    let mut aggregated_candles = Vec::new();

    // Primary chain aggregation (single parent)
    let parent_timeframes = source_candle.timeframe.parent_timeframes();
    for target_timeframe in parent_timeframes {
      if let Some(aggregated) = self
        .aggregate_to_timeframe(source_candle, target_timeframe)
        .await?
      {
        info!(
          "Successfully aggregated {} to {}: volume={}, ticks={}",
          source_candle.timeframe,
          target_timeframe,
          aggregated.volume,
          aggregated.tick_count
        );

        // Store the aggregated candle first
        aggregated_candles.push(aggregated.clone());

        // Recursively aggregate the newly created candle to even higher timeframes
        let higher_aggregated = Box::pin(self.aggregate_candle(&aggregated)).await?;
        aggregated_candles.extend(higher_aggregated);
      }
    }

    // Independent chains (special cases)
    let independent_candles = self.create_independent_chains(source_candle).await?;
    aggregated_candles.extend(independent_candles);

    Ok(aggregated_candles)
  }

  /// Create independent chain candles (M3 from M1; M30 from M15; H2 from H1)
  async fn create_independent_chains(&self, source_candle: &Candle) -> Result<Vec<Candle>, CandleError> {
    let mut independent_candles = Vec::new();

    match source_candle.timeframe {
      TimeFrame::M1 => {
        // Try to create M3 (3 M1 → 1 M3)
        if let Some(m3_candle) = self
          .aggregate_to_timeframe(source_candle, TimeFrame::M3)
          .await?
        {
          info!("Created independent M3 candle: volume={}, ticks={}", m3_candle.volume, m3_candle.tick_count);
          independent_candles.push(m3_candle);
        }
      }
      TimeFrame::M15 => {
        // Try to create M30 (2 M15 → 1 M30)
        if let Some(m30_candle) = self
          .aggregate_to_timeframe(source_candle, TimeFrame::M30)
          .await?
        {
          info!("Created independent M30 candle: volume={}, ticks={}", m30_candle.volume, m30_candle.tick_count);
          independent_candles.push(m30_candle);
        }
      }
      TimeFrame::H1 => {
        // Try to create H2 (2 H1 → 1 H2)
        if let Some(h2_candle) = self
          .aggregate_to_timeframe(source_candle, TimeFrame::H2)
          .await?
        {
          info!("Created independent H2 candle: volume={}, ticks={}", h2_candle.volume, h2_candle.tick_count);
          independent_candles.push(h2_candle);
        }
      }
      _ => {
        // No independent chains for other timeframes
      }
    }

    Ok(independent_candles)
  }

  /// Helper method to check and create aggregated candle for a specific time window
  async fn check_and_create_aggregated_candle(
    &self,
    source_candle: &Candle,
    target_timeframe: TimeFrame,
    target_start: DateTime<Utc>,
    target_end: DateTime<Utc>,
  ) -> Result<Option<Candle>, CandleError> {
    let required_count = self.get_required_candle_count(source_candle.timeframe, target_timeframe);

    // Get source candles within the target timeframe range
    let source_candles = self.get_candles_range(
      &source_candle.market_id,
      source_candle.timeframe,
      target_start,
      target_end
    ).await;

    info!(
      "{:?} aggregation check: market={}, target_start={}, target_end={}, found_candles={}, required={}",
      target_timeframe,
      source_candle.market_id,
      target_start.format("%H:%M:%S"),
      target_end.format("%H:%M:%S"),
      source_candles.len(),
      required_count
    );

    if source_candles.len() < required_count {
      info!("Not enough {:?} candles for {:?} aggregation: found={}, required={}",
        source_candle.timeframe, target_timeframe, source_candles.len(), required_count);
      return Ok(None);
    }

    // Filter candles that are within the target timeframe and are closed
    let mut filtered_candles: Vec<Candle> = source_candles
      .into_iter()
      .filter(|candle| {
        candle.start_time >= target_start
          && candle.start_time < target_end
          && candle.is_closed
      })
      .collect();

    if filtered_candles.len() < required_count {
      info!("Not enough closed candles after filtering: found={}, required={}",
        filtered_candles.len(), required_count);
      return Ok(None);
    }

    // Sort by start time to ensure correct OHLC calculation
    filtered_candles.sort_by_key(|candle| candle.start_time);

    info!("Creating {:?} candle from {} {:?} candles",
      target_timeframe, filtered_candles.len(), source_candle.timeframe);

    // Create aggregated candle from filtered candles
    let aggregated_candle = self
      .create_aggregated_candle(&filtered_candles, target_timeframe, target_start, target_end)
      .await?;

    Ok(Some(aggregated_candle))
  }

  /// Aggregate source candle to a specific target timeframe
  async fn aggregate_to_timeframe(
    &self,
    source_candle: &Candle,
    target_timeframe: TimeFrame,
  ) -> Result<Option<Candle>, CandleError> {

    // Calculate target candle timerange for current window
    let target_start = target_timeframe.round_timestamp(source_candle.start_time);
    let target_end = target_start + Duration::seconds(target_timeframe.duration_secs());

    // For ALL timeframes, check previous completed window first
    // This ensures we don't miss completed periods when candle boundaries cross over
    let prev_target_start = target_start - Duration::seconds(target_timeframe.duration_secs());
    let prev_target_end = target_start;

    // Check if previous window is complete
    if let Some(prev_candle) = self.check_and_create_aggregated_candle(
      source_candle, target_timeframe, prev_target_start, prev_target_end
    ).await? {
      return Ok(Some(prev_candle));
    }

    // Check current window using helper method
    if let Some(aggregated_candle) = self.check_and_create_aggregated_candle(
      source_candle, target_timeframe, target_start, target_end
    ).await? {
      return Ok(Some(aggregated_candle));
    }

    // If we reach here, no aggregation was possible
    Ok(None)
  }

  /// Check if a candle should be force closed based on time
  fn should_force_close_candle(
    &self,
    builder: &CandleBuilder,
    target_timeframe: TimeFrame,
    current_time: DateTime<Utc>,
  ) -> bool {
    let candle_duration = Duration::seconds(target_timeframe.duration_secs());
    let expected_end_time = builder.start_time + candle_duration;

    // Force close if current time has passed the expected end time
    // and we have some data in the builder
    current_time >= expected_end_time && builder.tick_count > 0
  }

  /// Start periodic candle closure task (should be called on Arc<CandleStore>)
  pub fn start_periodic_closure(store: Arc<CandleStore>) {
    let store_weak = Arc::downgrade(&store);

    tokio::spawn(async move {
      let mut interval = tokio::time::interval(tokio::time::Duration::from_secs(60)); // Check every minute

      loop {
        interval.tick().await;

        if let Some(store) = store_weak.upgrade() {
          if let Err(e) = store.check_and_close_expired_candles().await {
            tracing::error!("Failed to close expired candles: {}", e);
          }
        } else {
          // Store has been dropped, exit the task
          break;
        }
      }
    });
  }

  /// Check and close any expired candles
  async fn check_and_close_expired_candles(&self) -> Result<(), CandleError> {
    let now = Utc::now();
    let mut closed_candles = Vec::new();

    // Collect expired candles and prepare reset data without holding the lock
    {
      let mut builders = self.builders.lock();
      for (market_id, market_builders) in builders.iter_mut() {
        let mut builders_to_reset = Vec::new();

        for (timeframe, builder) in market_builders.iter() {
          // Only check primary timeframes that receive direct tick data
          if !self.is_primary_timeframe(*timeframe) {
            continue;
          }

          let candle_duration = Duration::seconds(timeframe.duration_secs());
          let expected_end_time = builder.start_time + candle_duration;

          // Add grace period to avoid premature closing
          let grace_period = Duration::seconds(timeframe.duration_secs() / 10); // 10% grace period
          let close_time = expected_end_time + grace_period;

          // If candle should be closed based on time and has data
          if now >= close_time && builder.tick_count > 0 {
            // Validate builder state before closing
            if builder.open > Some(0.0) && builder.volume >= 0.0 {
              let closed_candle = builder
                .clone()
                .build(true, DataSource::WebSocketTick); // Correct data source for tick-based candles

              closed_candles.push((market_id.clone(), *timeframe, closed_candle));

              // Mark this builder for reset with aligned timestamp
              let next_start = timeframe.round_timestamp(now);
              builders_to_reset.push((*timeframe, next_start));
            } else {
              tracing::warn!(
                "Invalid builder state for force close: market={}, timeframe={:?}, open={:?}, volume={}",
                market_id, timeframe, builder.open, builder.volume
              );
            }
          }
        }

        // Reset builders that were closed
        for (timeframe, next_start) in builders_to_reset {
          market_builders.insert(
            timeframe,
            CandleBuilder::new(market_id.clone(), timeframe, next_start),
          );
        }
      }
    } // Release builder lock here

    // Process closed candles outside the lock
    for (market_id, timeframe, candle) in closed_candles {
      tracing::info!(
        "Force closing expired candle: market={}, timeframe={:?}, start={}, end={}, volume={}, ticks={}",
        market_id,
        timeframe,
        candle.start_time.format("%Y-%m-%d %H:%M:%S"),
        candle.end_time.format("%Y-%m-%d %H:%M:%S"),
        candle.volume,
        candle.tick_count
      );

      // Store the candle
      self.store_candle(candle.clone()).await;

      // Publish event
      self.publish_candle_closed_event(&candle).await;

      // Update metrics
      self.metrics.record_candle_closed(timeframe);

      // Aggregate to higher timeframes if this is M1 and aggregation is enabled
      if timeframe == TimeFrame::M1 && self.config.aggregation_enabled {
        match self.aggregate_candle(&candle).await {
          Ok(aggregated_candles) => {
            for agg_candle in aggregated_candles {
              tracing::debug!(
                "Created aggregated candle from force-closed: timeframe={:?}, start={}, volume={}",
                agg_candle.timeframe,
                agg_candle.start_time.format("%Y-%m-%d %H:%M:%S"),
                agg_candle.volume
              );
              // Note: Storage will be handled by the main process_tick flow
              // to avoid duplicate storage of the same aggregated candle
            }
          },
          Err(e) => {
            tracing::error!("Failed to aggregate force-closed candle: {}", e);
          }
        }
      }
    }

    Ok(())
  }

  /// Check if timeframe receives direct tick data (primary timeframes)
  fn is_primary_timeframe(&self, timeframe: TimeFrame) -> bool {
    match timeframe {
      // Only M1 receives direct tick data in our current setup
      TimeFrame::M1 => true,
      // All other timeframes are aggregated
      _ => false,
    }
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
    let cleaned = 0;

    // Ring buffers handle their own size limits automatically
    // Additional cleanup logic could be added here for specific needs

    tracing::info!("Cleanup completed, processed {} items", cleaned);
    cleaned
  }

  /// Force close all current candles (useful for shutdown)
  pub async fn close_all_current_candles(&self) -> Vec<Candle> {
    let mut candles_to_process = Vec::new();

    // Collect all candles to close while holding the lock
    {
      let mut builders = self.builders.lock();

      for (_market_id, market_builders) in builders.iter_mut() {
        for (_timeframe, builder) in market_builders.iter_mut() {
          if !builder.is_empty() {
            let closed_candle = builder.clone().build(true, DataSource::WebSocketTick);
            candles_to_process.push(closed_candle);
          }
        }
      }

      // Clear all builders while still holding the lock
      builders.clear();
    } // Release lock here

    // Process candles outside the lock to avoid deadlock
    for candle in &candles_to_process {
      // Store the closed candle
      self.store_candle(candle.clone()).await;

      // Publish event
      self.publish_candle_closed_event(candle).await;

      // Update metrics
      self.metrics.record_candle_closed(candle.timeframe);
    }

    candles_to_process
  }

  /// Get metrics instance
  pub fn get_metrics(&self) -> Arc<CandleMetrics> {
    self.metrics.clone()
  }

  /// Get required number of source candles for target timeframe
  fn get_required_candle_count(
    &self,
    source_timeframe: TimeFrame,
    target_timeframe: TimeFrame,
  ) -> usize {
    match (source_timeframe, target_timeframe) {
      // Primary Trading Chain (Single Path)
      (TimeFrame::M1, TimeFrame::M5) => 5,   // 5 M1 -> 1 M5
      (TimeFrame::M5, TimeFrame::M15) => 3,  // 3 M5 -> 1 M15
      (TimeFrame::M15, TimeFrame::H1) => 4,  // 4 M15 -> 1 H1
      (TimeFrame::H1, TimeFrame::H4) => 4,   // 4 H1 -> 1 H4
      (TimeFrame::H4, TimeFrame::D1) => 6,   // 6 H4 -> 1 D1
      (TimeFrame::D1, TimeFrame::W1) => 7,   // 7 D1 -> 1 W1
      (TimeFrame::W1, TimeFrame::MN1) => 4,  // 4 W1 -> 1 MN1

      // Independent Chains (No conflicts)
      (TimeFrame::M1, TimeFrame::M3) => 3,     // 3 M1 -> 1 M3 (scalping)
      (TimeFrame::M15, TimeFrame::M30) => 2,   // 2 M15 -> 1 M30 (swing trading)
      (TimeFrame::H1, TimeFrame::H2) => 2,     // 2 H1 -> 1 H2 (alt hours)

      _ => 1,                                // Default case
    }
  }

  /// Add candle to aggregation buffer for later processing
  async fn add_to_aggregation_buffer(
    &self,
    _candle: &Candle,
    _target_timeframe: TimeFrame,
  ) -> Result<(), CandleError> {
    // For now, just return Ok - we'll implement this later if needed
    // This is a placeholder for future implementation
    Ok(())
  }

  /// Create aggregated candle from source candles
  async fn create_aggregated_candle(
    &self,
    source_candles: &[Candle],
    target_timeframe: TimeFrame,
    target_start: DateTime<Utc>,
    target_end: DateTime<Utc>,
  ) -> Result<Candle, CandleError> {
    if source_candles.is_empty() {
      return Err(CandleError::InvalidCandleData(
        "No source candles provided".to_string(),
      ));
    }

    // Sort candles by start_time to ensure correct order
    let mut sorted_candles = source_candles.to_vec();
    sorted_candles.sort_by(|a, b| a.start_time.cmp(&b.start_time));

    let market_id = sorted_candles[0].market_id.clone();

    // Open price is from the first candle in timeframe
    let open = sorted_candles[0].open;

    // Close price is from the last candle in timeframe
    let close = sorted_candles.last().unwrap().close;

    let mut high = f64::MIN;
    let mut low = f64::MAX;
    let mut volume = 0.0;
    let mut tick_count = 0;
    let mut total_vwap_weighted = 0.0;

    // Aggregate all candles within the timeframe
    for candle in &sorted_candles {
      high = high.max(candle.high);
      low = low.min(candle.low);
      volume += candle.volume;
      tick_count += candle.tick_count;

      // Accumulate VWAP weighted by volume
      if candle.volume > 0.0 {
        total_vwap_weighted += candle.vwap * candle.volume;
      }
    }

    // Calculate VWAP safely
    let vwap = if volume > 0.0 {
      total_vwap_weighted / volume
    } else if tick_count > 0 {
      // Fallback: simple average price if no volume
      (open + high + low + close) / 4.0
    } else {
      // Last resort: use close price
      close
    };

    Ok(Candle {
      market_id,
      timeframe: target_timeframe,
      start_time: target_start,
      end_time: target_end,
      open,
      high,
      low,
      close,
      volume,
      tick_count,
      vwap,
      spread_avg: 0.0, // Will be calculated if needed
      spread_min: 0.0,
      spread_max: 0.0,
      is_closed: true,
      metadata: CandleMetadata {
        created_at: Utc::now(),
        source: DataSource::Aggregated(sorted_candles[0].timeframe),
        quality_score: 1.0,
        gap_detected: false,
        volatility_z_score: None,
      },
    })
  }
}

