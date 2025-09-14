use super::types::*;
use chrono::{DateTime, Utc};
use std::collections::VecDeque;

/// Efficient ring buffer for storing candles with automatic cleanup
#[derive(Debug)]
pub struct CandleRingBuffer {
  buffer: VecDeque<Candle>,
  capacity: usize,
  total_written: u64,
}

impl CandleRingBuffer {
  /// Create a new ring buffer with specified capacity
  pub fn new(capacity: usize) -> Self {
    Self {
      buffer: VecDeque::with_capacity(capacity),
      capacity,
      total_written: 0,
    }
  }

  /// Push a new candle, automatically removing old ones if at capacity
  pub fn push(&mut self, candle: Candle) {
    if self.buffer.len() >= self.capacity {
      self.buffer.pop_front();
    }
    self.buffer.push_back(candle);
    self.total_written += 1;
  }

  /// Get the latest N candles in chronological order
  pub fn get_latest(&self, count: usize) -> Vec<&Candle> {
    let start = self.buffer.len().saturating_sub(count);
    self.buffer.range(start..).collect()
  }

  /// Get all candles in the buffer
  pub fn get_all(&self) -> Vec<&Candle> {
    self.buffer.iter().collect()
  }

  /// Get candles within a time range
  pub fn get_range(&self, start: DateTime<Utc>, end: DateTime<Utc>) -> Vec<&Candle> {
    self
      .buffer
      .iter()
      .filter(|c| c.start_time >= start && c.start_time < end)
      .collect()
  }

  /// Get the most recent candle
  pub fn get_last(&self) -> Option<&Candle> {
    self.buffer.back()
  }

  /// Get the oldest candle in buffer
  pub fn get_first(&self) -> Option<&Candle> {
    self.buffer.front()
  }

  /// Find candle by exact timestamp
  pub fn get_by_timestamp(&self, timestamp: DateTime<Utc>) -> Option<&Candle> {
    self.buffer.iter().find(|c| c.start_time == timestamp)
  }

  /// Get candles since a specific timestamp
  pub fn get_since(&self, since: DateTime<Utc>) -> Vec<&Candle> {
    self
      .buffer
      .iter()
      .filter(|c| c.start_time >= since)
      .collect()
  }

  /// Check if buffer contains candle at timestamp
  pub fn contains_timestamp(&self, timestamp: DateTime<Utc>) -> bool {
    self.buffer.iter().any(|c| c.start_time == timestamp)
  }

  /// Get number of candles in buffer
  pub fn len(&self) -> usize {
    self.buffer.len()
  }

  /// Check if buffer is empty
  pub fn is_empty(&self) -> bool {
    self.buffer.is_empty()
  }

  /// Get buffer capacity
  pub fn capacity(&self) -> usize {
    self.capacity
  }

  /// Get total number of candles written (including overwritten ones)
  pub fn total_written(&self) -> u64 {
    self.total_written
  }

  /// Estimate memory usage in bytes
  pub fn memory_usage(&self) -> usize {
    self.buffer.len() * std::mem::size_of::<Candle>()
  }

  /// Get time range covered by the buffer
  pub fn time_range(&self) -> Option<(DateTime<Utc>, DateTime<Utc>)> {
    match (self.buffer.front(), self.buffer.back()) {
      (Some(first), Some(last)) => Some((first.start_time, last.end_time)),
      _ => None,
    }
  }

  /// Clear all candles from buffer
  pub fn clear(&mut self) {
    self.buffer.clear();
  }

  /// Shrink buffer capacity (removes oldest candles if necessary)
  pub fn shrink_to(&mut self, new_capacity: usize) {
    if new_capacity < self.capacity {
      let excess = self.buffer.len().saturating_sub(new_capacity);
      self.buffer.drain(..excess);

      self.buffer.shrink_to_fit();
      self.capacity = new_capacity;
    }
  }

  /// Get buffer statisticslet
  pub fn statistics(&self) -> RingBufferStats {
    let time_range = self.time_range();
    RingBufferStats {
      current_size: self.len(),
      capacity: self.capacity,
      total_written: self.total_written,
      memory_usage: self.memory_usage(),
      oldest_timestamp: time_range.map(|(start, _)| start),
      newest_timestamp: time_range.map(|(_, end)| end),
      utilization_pct: (self.len() as f64 / self.capacity as f64) * 100.0,
    }
  }

  /// Get iterator over all candles
  pub fn iter(&self) -> impl Iterator<Item = &Candle> {
    self.buffer.iter()
  }

  /// Get iterator over candles in reverse chronological order
  pub fn iter_rev(&self) -> impl Iterator<Item = &Candle> {
    self.buffer.iter().rev()
  }
}

/// Statistics about ring buffer usage
#[derive(Debug, Clone)]
pub struct RingBufferStats {
  pub current_size: usize,
  pub capacity: usize,
  pub total_written: u64,
  pub memory_usage: usize,
  pub oldest_timestamp: Option<DateTime<Utc>>,
  pub newest_timestamp: Option<DateTime<Utc>>,
  pub utilization_pct: f64,
}

impl Default for CandleRingBuffer {
  fn default() -> Self {
    Self::new(1000) // Default capacity
  }
}
