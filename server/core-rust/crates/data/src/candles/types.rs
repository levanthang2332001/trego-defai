use chrono::{DateTime, Datelike, Duration, Timelike, Utc};
use serde::{Deserialize, Serialize};
use std::fmt;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Candle {
  pub market_id: String,
  pub timeframe: TimeFrame,
  pub start_timestamp: i64, // Unix timestamp from WebSocket
  pub end_timestamp: i64,   // Unix timestamp
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
  // Backward compatibility - computed from timestamps
  pub start_time: DateTime<Utc>,
  pub end_time: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CandleMetadata {
  pub created_timestamp: i64, // Unix timestamp from WebSocket
  pub source: DataSource,
  pub quality_score: f64, // 0.0 - 1.0
  pub gap_detected: bool,
  pub volatility_z_score: Option<f64>,
  pub ws_sequence: Option<u64>, // WebSocket sequence number
  // Backward compatibility
  pub created_at: DateTime<Utc>,
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
      TimeFrame::Tick => vec![TimeFrame::S1], // Tick → 1s
      TimeFrame::S1 => vec![TimeFrame::M1],   // 60 S1 → 1 M1
      TimeFrame::S5 => vec![TimeFrame::M1],   // 12 S5 → 1 M1
      TimeFrame::S15 => vec![TimeFrame::M1],  // 4 S15 → 1 M1
      TimeFrame::S30 => vec![TimeFrame::M1],  // 2 S30 → 1 M1

      // Single Parent Chain Only (No Conflicts)
      TimeFrame::M1 => vec![TimeFrame::M5],  // 5 M1 → 1 M5
      TimeFrame::M5 => vec![TimeFrame::M15], // 3 M5 → 1 M15
      TimeFrame::M15 => vec![TimeFrame::H1], // 4 M15 → 1 H1
      TimeFrame::H1 => vec![TimeFrame::H4],  // 4 H1 → 1 H4
      TimeFrame::H4 => vec![TimeFrame::D1],  // 6 H4 → 1 D1

      // Independent Single-Source Chains
      TimeFrame::M3 => vec![],  // Created separately from M1 (3 M1 → 1 M3)
      TimeFrame::M30 => vec![], // Created separately from M1 (30 M1 → 1 M30)
      TimeFrame::H2 => vec![],  // Created separately from H1 (2 H1 → 1 H2)
      TimeFrame::H6 => vec![],  // Unused in clean chains
      TimeFrame::H12 => vec![], // Unused in clean chains

      // Daily and above
      TimeFrame::D1 => vec![TimeFrame::W1],  // 7 D1 → 1 W1
      TimeFrame::W1 => vec![TimeFrame::MN1], // ~4.3 W1 → 1 MN1
      TimeFrame::MN1 => vec![],              // Highest timeframe
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

/// Token configuration for supported cryptocurrencies
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
pub enum Token {
  BTC,
  ETH,
  SOL,
  APTOS,
}

impl Token {
  pub fn symbol(&self) -> &'static str {
    match self {
      Token::BTC => "BTC",
      Token::ETH => "ETH",
      Token::SOL => "SOL",
      Token::APTOS => "APT",
    }
  }

  pub fn market_id(&self) -> &'static str {
    match self {
      Token::BTC => "15",
      Token::ETH => "16",
      Token::SOL => "31",
      Token::APTOS => "14",
    }
  }

  pub fn full_name(&self) -> &'static str {
    match self {
      Token::BTC => "Bitcoin",
      Token::ETH => "Ethereum",
      Token::SOL => "Solana",
      Token::APTOS => "Aptos",
    }
  }

  pub fn decimals(&self) -> u8 {
    match self {
      Token::BTC => 8,
      Token::ETH => 18,
      Token::SOL => 9,
      Token::APTOS => 8,
    }
  }

  pub fn from_market_id(market_id: &str) -> Option<Self> {
    match market_id {
      "15" => Some(Token::BTC),
      "16" => Some(Token::ETH),
      "31" => Some(Token::SOL),
      "14" => Some(Token::APTOS),
      _ => None,
    }
  }

  pub fn from_symbol(symbol: &str) -> Option<Self> {
    match symbol.to_uppercase().as_str() {
      "BTC" | "BITCOIN" => Some(Token::BTC),
      "ETH" | "ETHEREUM" => Some(Token::ETH),
      "SOL" | "SOLANA" => Some(Token::SOL),
      "APT" | "APTOS" => Some(Token::APTOS),
      _ => None,
    }
  }

  pub fn all_tokens() -> Vec<Self> {
    vec![Token::BTC, Token::ETH, Token::SOL, Token::APTOS]
  }

  pub fn trading_pairs(&self, base: &str) -> String {
    format!("{}-{}", self.symbol(), base.to_uppercase())
  }
}

impl fmt::Display for Token {
  fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
    write!(f, "{}", self.symbol())
  }
}

/// Market pair configuration
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MarketPair {
  pub base: Token,
  pub quote: String, // Usually "USDT", "USD", "USDC"
  pub market_id: String,
  pub min_price_increment: f64,
  pub min_size_increment: f64,
  pub min_notional: f64,
}

impl MarketPair {
  pub fn new(base: Token, quote: &str) -> Self {
    Self {
      market_id: base.market_id().to_string(),
      base: base.clone(),
      quote: quote.to_uppercase(),
      min_price_increment: match base {
        Token::BTC => 0.01,
        Token::ETH => 0.01,
        Token::SOL => 0.001,
        Token::APTOS => 0.0001,
      },
      min_size_increment: match base {
        Token::BTC => 0.00001,
        Token::ETH => 0.0001,
        Token::SOL => 0.001,
        Token::APTOS => 0.01,
      },
      min_notional: 10.0, // $10 minimum order size
    }
  }

  pub fn symbol(&self) -> String {
    format!("{}-{}", self.base.symbol(), self.quote)
  }

  pub fn default_pairs() -> Vec<Self> {
    Token::all_tokens()
      .into_iter()
      .map(|token| MarketPair::new(token, "USDT"))
      .collect()
  }
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

  #[error("Unknown token: {0}")]
  UnknownToken(String),

  #[error("Invalid market pair: {0}")]
  InvalidMarketPair(String),
}

/// Simplified WebSocket Candle - directly from WebSocket API
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct WebSocketCandle {
  pub market_id: String, // "15", "16", "31", "14"
  pub timeframe: String, // "1m", "5m", "1h", etc.
  pub timestamp: i64,    // Unix timestamp from WebSocket (1757581621)
  pub open: f64,         // OHLC prices from WebSocket
  pub high: f64,
  pub low: f64,
  pub close: f64,
  pub volume: f64,              // Volume from WebSocket
  pub trade_count: Option<u64>, // Number of trades
  pub vwap: Option<f64>,        // VWAP if provided
  pub sequence: Option<u64>,    // WebSocket sequence
}

impl WebSocketCandle {
  /// Create from WebSocket JSON data
  pub fn from_websocket_data(
    market_id: String,
    timeframe: String,
    timestamp: i64,
    open: f64,
    high: f64,
    low: f64,
    close: f64,
    volume: f64,
    trade_count: Option<u64>,
    sequence: Option<u64>,
  ) -> Self {
    Self {
      market_id,
      timeframe,
      timestamp,
      open,
      high,
      low,
      close,
      volume,
      trade_count,
      vwap: Some((open + high + low + close) / 4.0), // Calculate VWAP
      sequence,
    }
  }

  /// Convert to Token enum
  pub fn token(&self) -> Option<Token> {
    Token::from_market_id(&self.market_id)
  }

  /// Convert to TimeFrame enum
  pub fn timeframe_enum(&self) -> Option<TimeFrame> {
    match self.timeframe.as_str() {
      "1s" => Some(TimeFrame::S1),
      "5s" => Some(TimeFrame::S5),
      "15s" => Some(TimeFrame::S15),
      "30s" => Some(TimeFrame::S30),
      "1m" => Some(TimeFrame::M1),
      "3m" => Some(TimeFrame::M3),
      "5m" => Some(TimeFrame::M5),
      "15m" => Some(TimeFrame::M15),
      "30m" => Some(TimeFrame::M30),
      "1h" => Some(TimeFrame::H1),
      "2h" => Some(TimeFrame::H2),
      "4h" => Some(TimeFrame::H4),
      "6h" => Some(TimeFrame::H6),
      "12h" => Some(TimeFrame::H12),
      "1d" => Some(TimeFrame::D1),
      "1w" => Some(TimeFrame::W1),
      "1M" => Some(TimeFrame::MN1),
      _ => None,
    }
  }

  /// Get readable timestamp
  pub fn readable_time(&self) -> String {
    DateTime::from_timestamp(self.timestamp, 0)
      .map(|dt| dt.format("%Y-%m-%d %H:%M:%S UTC").to_string())
      .unwrap_or_else(|| "Invalid timestamp".to_string())
  }

  /// Validate candle data
  pub fn is_valid(&self) -> bool {
    self.open > 0.0
      && self.high > 0.0
      && self.low > 0.0
      && self.close > 0.0
      && self.high >= self.open.max(self.close)
      && self.low <= self.open.min(self.close)
      && self.volume >= 0.0
      && self.timestamp > 0
  }
}

/// Market summary statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketSummary {
  pub market_id: String,
  pub timeframe: TimeFrame,
  pub candle_count: u64,
  pub first_candle: Option<DateTime<Utc>>,
  pub last_candle: Option<DateTime<Utc>>,
  pub avg_volume: Option<f64>,
  pub avg_quality: Option<f64>,
  pub gaps_detected: u64,
}

/// Database statistics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DatabaseStats {
  pub total_candles: u64,
  pub unique_markets: u64,
  pub unique_timeframes: u64,
  pub oldest_record: Option<DateTime<Utc>>,
  pub newest_record: Option<DateTime<Utc>>,
  pub table_size: String,
}
