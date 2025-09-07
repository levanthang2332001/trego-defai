use chrono::{DateTime, Datelike, Duration, Timelike, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Candle {
  pub market_id: String,
  pub timeframe: TimeFrame,
  pub start_time: DateTime<Utc>,
  pub end_time: DateTime<Utc>,
  pub open: f64,
  pub high: f64,
  pub low: f64,
  pub close: f64,
  pub volume: f64,
  pub tick_count: u64,
  pub vwap: f64,
  pub spread_avg: f64,
  pub spread_min: f64,
  pub spread_max: f64,
  pub is_closed: bool,
  pub metadata: CandleMetadata,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CandleMetadata {
  pub created_at: DateTime<Utc>,
  pub source: DataSource,
  pub quality_score: f64, // 0.0 - 1.0
  pub gap_detected: bool,
  pub volatility_z_score: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DataSource {
  WebSocketTick,
  RestAPI,
  FileImport,
  Aggregated(TimeFrame), // Rolled up from another timeframe
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum TimeFrame {
  Tick, // Raw tick data
  S1,   // 1 second
  S5,   // 5 seconds
  S15,  // 15 seconds
  S30,  // 30 seconds
  M1,   // 1 minute
  M3,   // 3 minutes
  M5,   // 5 minutes
  M15,  // 15 minutes
  M30,  // 30 minutes
  H1,   // 1 hour
  H2,   // 2 hours
  H4,   // 4 hours
  H6,   // 6 hours
  H12,  // 12 hours
  D1,   // 1 day
  W1,   // 1 week
  MN1,  // 1 month
}

impl TimeFrame {
  pub fn duration_secs(&self) -> i64 {
    match self {
      TimeFrame::Tick => 0,
      TimeFrame::S1 => 1,
      TimeFrame::S5 => 5,
      TimeFrame::S15 => 15,
      TimeFrame::S30 => 30,
      TimeFrame::M1 => 60,
      TimeFrame::M3 => 180,
      TimeFrame::M5 => 300,
      TimeFrame::M15 => 900,
      TimeFrame::M30 => 1800,
      TimeFrame::H1 => 3600,
      TimeFrame::H2 => 7200,
      TimeFrame::H4 => 14400,
      TimeFrame::H6 => 21600,
      TimeFrame::H12 => 43200,
      TimeFrame::D1 => 86400,
      TimeFrame::W1 => 604800,
      TimeFrame::MN1 => 2628000, // ~30.4 days
    }
  }

  pub fn all_standard_timeframes() -> Vec<TimeFrame> {
    vec![
      TimeFrame::M1,
      TimeFrame::M3,
      TimeFrame::M5,
      TimeFrame::M15,
      TimeFrame::M30,
      TimeFrame::H1,
      TimeFrame::H2,
      TimeFrame::H4,
      TimeFrame::H6,
      TimeFrame::H12,
      TimeFrame::D1,
      TimeFrame::W1,
      TimeFrame::MN1,
    ]
  }

  pub fn trading_timeframes() -> Vec<TimeFrame> {
    vec![
      TimeFrame::M1,
      TimeFrame::M5,
      TimeFrame::M15,
      TimeFrame::M30,
      TimeFrame::H1,
      TimeFrame::H4,
      TimeFrame::D1,
    ]
  }

  pub fn round_timestamp(&self, timestamp: DateTime<Utc>) -> DateTime<Utc> {
    match self {
      TimeFrame::Tick => timestamp,
      TimeFrame::S1 => timestamp.with_nanosecond(0).unwrap(),
      TimeFrame::S5 => {
        let second = (timestamp.second() / 5) * 5;
        timestamp
          .with_second(second)
          .unwrap()
          .with_nanosecond(0)
          .unwrap()
      }
      TimeFrame::S15 => {
        let second = (timestamp.second() / 15) * 15;
        timestamp
          .with_second(second)
          .unwrap()
          .with_nanosecond(0)
          .unwrap()
      }
      TimeFrame::S30 => {
        let second = (timestamp.second() / 30) * 30;
        timestamp
          .with_second(second)
          .unwrap()
          .with_nanosecond(0)
          .unwrap()
      }
      TimeFrame::M1 => timestamp
        .with_second(0)
        .unwrap()
        .with_nanosecond(0)
        .unwrap(),
      TimeFrame::M3 => {
        let minute = (timestamp.minute() / 3) * 3;
        timestamp
          .with_minute(minute)
          .unwrap()
          .with_second(0)
          .unwrap()
          .with_nanosecond(0)
          .unwrap()
      }
      TimeFrame::M5 => {
        let minute = (timestamp.minute() / 5) * 5;
        timestamp
          .with_minute(minute)
          .unwrap()
          .with_second(0)
          .unwrap()
          .with_nanosecond(0)
          .unwrap()
      }
      TimeFrame::M15 => {
        let minute = (timestamp.minute() / 15) * 15;
        timestamp
          .with_minute(minute)
          .unwrap()
          .with_second(0)
          .unwrap()
          .with_nanosecond(0)
          .unwrap()
      }
      TimeFrame::M30 => {
        let minute = (timestamp.minute() / 30) * 30;
        timestamp
          .with_minute(minute)
          .unwrap()
          .with_second(0)
          .unwrap()
          .with_nanosecond(0)
          .unwrap()
      }
      TimeFrame::H1 => timestamp
        .with_minute(0)
        .unwrap()
        .with_second(0)
        .unwrap()
        .with_nanosecond(0)
        .unwrap(),
      TimeFrame::H2 => {
        let hour = (timestamp.hour() / 2) * 2;
        timestamp
          .with_hour(hour)
          .unwrap()
          .with_minute(0)
          .unwrap()
          .with_second(0)
          .unwrap()
          .with_nanosecond(0)
          .unwrap()
      }
      TimeFrame::H4 => {
        let hour = (timestamp.hour() / 4) * 4;
        timestamp
          .with_hour(hour)
          .unwrap()
          .with_minute(0)
          .unwrap()
          .with_second(0)
          .unwrap()
          .with_nanosecond(0)
          .unwrap()
      }
      TimeFrame::H6 => {
        let hour = (timestamp.hour() / 6) * 6;
        timestamp
          .with_hour(hour)
          .unwrap()
          .with_minute(0)
          .unwrap()
          .with_second(0)
          .unwrap()
          .with_nanosecond(0)
          .unwrap()
      }
      TimeFrame::H12 => {
        let hour = (timestamp.hour() / 12) * 12;
        timestamp
          .with_hour(hour)
          .unwrap()
          .with_minute(0)
          .unwrap()
          .with_second(0)
          .unwrap()
          .with_nanosecond(0)
          .unwrap()
      }
      TimeFrame::D1 => timestamp
        .with_hour(0)
        .unwrap()
        .with_minute(0)
        .unwrap()
        .with_second(0)
        .unwrap()
        .with_nanosecond(0)
        .unwrap(),
      TimeFrame::W1 => {
        // Round to Monday 00:00:00
        let days_since_monday = timestamp.weekday().num_days_from_monday();
        let monday = timestamp.date_naive() - Duration::days(days_since_monday as i64);
        monday.and_hms_opt(0, 0, 0).unwrap().and_utc()
      }
      TimeFrame::MN1 => {
        // Round to first day of month
        timestamp
          .with_day(1)
          .unwrap()
          .with_hour(0)
          .unwrap()
          .with_minute(0)
          .unwrap()
          .with_second(0)
          .unwrap()
          .with_nanosecond(0)
          .unwrap()
      }
    }
  }

  pub fn parent_timeframes(&self) -> Vec<TimeFrame> {
    match self {
      // Multiple aggregation paths per timeframe
      // Primary chain: Tick → S1 → M1 → M5 → M15 → H1 → H4 → D1 → W1 → MN1
      // Parallel chains: M1 → M30 → H6 → H12, M1 → H2
      TimeFrame::Tick => vec![TimeFrame::S1],              // Tick → 1s
      TimeFrame::S1 => vec![TimeFrame::M1],                // 60 S1 → 1 M1
      TimeFrame::S5 => vec![TimeFrame::M1],                // 12 S5 → 1 M1
      TimeFrame::S15 => vec![TimeFrame::M1],               // 4 S15 → 1 M1
      TimeFrame::S30 => vec![TimeFrame::M1],               // 2 S30 → 1 M1

      // Single Parent Chain Only (No Conflicts)
      TimeFrame::M1 => vec![TimeFrame::M5],                // 5 M1 → 1 M5
      TimeFrame::M5 => vec![TimeFrame::M15],               // 3 M5 → 1 M15  
      TimeFrame::M15 => vec![TimeFrame::H1],               // 4 M15 → 1 H1
      TimeFrame::H1 => vec![TimeFrame::H4],                // 4 H1 → 1 H4
      TimeFrame::H4 => vec![TimeFrame::D1],                // 6 H4 → 1 D1

      // Independent Single-Source Chains  
      TimeFrame::M3 => vec![],                             // Created separately from M1 (3 M1 → 1 M3)
      TimeFrame::M30 => vec![],                            // Created separately from M1 (30 M1 → 1 M30)
      TimeFrame::H2 => vec![],                             // Created separately from H1 (2 H1 → 1 H2)
      TimeFrame::H6 => vec![],                             // Unused in clean chains
      TimeFrame::H12 => vec![],                            // Unused in clean chains

      // Daily and above
      TimeFrame::D1 => vec![TimeFrame::W1],                // 7 D1 → 1 W1
      TimeFrame::W1 => vec![TimeFrame::MN1],               // ~4.3 W1 → 1 MN1
      TimeFrame::MN1 => vec![],                            // Highest timeframe
    }
  }
}

impl fmt::Display for TimeFrame {
  fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
    match self {
      TimeFrame::Tick => write!(f, "tick"),
      TimeFrame::S1 => write!(f, "1s"),
      TimeFrame::S5 => write!(f, "5s"),
      TimeFrame::S15 => write!(f, "15s"),
      TimeFrame::S30 => write!(f, "30s"),
      TimeFrame::M1 => write!(f, "1m"),
      TimeFrame::M3 => write!(f, "3m"),
      TimeFrame::M5 => write!(f, "5m"),
      TimeFrame::M15 => write!(f, "15m"),
      TimeFrame::M30 => write!(f, "30m"),
      TimeFrame::H1 => write!(f, "1h"),
      TimeFrame::H2 => write!(f, "2h"),
      TimeFrame::H4 => write!(f, "4h"),
      TimeFrame::H6 => write!(f, "6h"),
      TimeFrame::H12 => write!(f, "12h"),
      TimeFrame::D1 => write!(f, "1d"),
      TimeFrame::W1 => write!(f, "1w"),
      TimeFrame::MN1 => write!(f, "1M"),
    }
  }
}

#[derive(Debug, Clone)]
pub struct Tick {
  pub timestamp: DateTime<Utc>,
  pub market_id: String,
  pub price: f64,
  pub volume: f64,
  pub bid: Option<f64>,
  pub ask: Option<f64>,
  pub spread: Option<f64>,
  pub side: Option<TradeSide>,
  pub sequence: Option<u64>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub enum TradeSide {
  Buy,
  Sell,
  Unknown,
}

#[derive(Debug, thiserror::Error)]
pub enum CandleError {
  #[error("Invalid price: {0}")]
  InvalidPrice(f64),

  #[error("Invalid volume: {0}")]
  InvalidVolume(f64),

  #[error("Tick outside period: tick_time={tick_time}, period=[{period_start}, {period_end})")]
  TickOutsidePeriod {
    tick_time: DateTime<Utc>,
    period_start: DateTime<Utc>,
    period_end: DateTime<Utc>,
  },

  #[error("Invalid candle data: {0}")]
  InvalidCandleData(String),

  #[error("Storage error: {0}")]
  StorageError(String),

  #[error("Configuration error: {0}")]
  ConfigError(String),
}
