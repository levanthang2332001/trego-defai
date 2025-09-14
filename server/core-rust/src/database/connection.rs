use anyhow::Result;
use data::candles::{database::CandleDatabase, types::*};
use sqlx::{PgPool, Row};
use tracing::{error, info};

/// Database connection manager for multi-token candles system
#[derive(Debug)]
pub struct DatabaseManager {
  pool: PgPool,
  candle_db: CandleDatabase,
}

impl DatabaseManager {
  /// Create a new database manager with connection verification
  pub async fn new(database_url: &str) -> Result<Self> {
    info!("🔌 Connecting to database: {}", mask_password(database_url));

    // Create connection pool
    let pool = PgPool::connect(database_url).await?;

    // Create candle database instance
    let candle_db = CandleDatabase::new(pool.clone());

    // Verify database setup
    Self::verify_database_setup(&candle_db).await?;

    info!("✅ Database initialized successfully with multi-token support");

    Ok(Self { pool, candle_db })
  }

  /// Get the database pool
  pub fn pool(&self) -> &PgPool {
    &self.pool
  }

  /// Get the candle database instance
  pub fn candle_db(&self) -> &CandleDatabase {
    &self.candle_db
  }

  /// Verify database setup and multi-token support
  async fn verify_database_setup(candle_db: &CandleDatabase) -> Result<()> {
    info!("🔍 Verifying database setup and multi-token support...");

    // Check if candles table exists
    let result = sqlx::query(
      "SELECT COUNT(*) as count FROM information_schema.tables
             WHERE table_name = 'candles' AND table_schema = 'public'",
    )
    .fetch_one(candle_db.pool())
    .await?;

    let table_count: i64 = result.get("count");

    if table_count == 0 {
      error!("❌ 'candles' table not found!");
      error!("   Please run migrations: sqlx migrate run --source ./src/database/migrations");
      return Err(anyhow::anyhow!("Database schema not initialized"));
    }

    info!("✅ Database schema verified");

    // Verify token support
    let tokens = Token::all_tokens();
    info!("🪙 Verifying {} supported tokens:", tokens.len());

    for token in &tokens {
      info!(
        "   {} ({}): {} - {}",
        token.symbol(),
        token.market_id(),
        token.full_name(),
        format!("{} decimals", token.decimals())
      );
    }

    // Check existing data
    let mut total_candles = 0u64;
    for token in &tokens {
      let count = sqlx::query("SELECT COUNT(*) as count FROM candles WHERE market_id = $1")
        .bind(token.market_id())
        .fetch_one(candle_db.pool())
        .await?;

      let candle_count: i64 = count.get("count");
      if candle_count > 0 {
        info!("   ✅ {} has {} candles", token.symbol(), candle_count);
        total_candles += candle_count as u64;
      }
    }

    if total_candles > 0 {
      info!("📊 Total candles in database: {}", total_candles);
    } else {
      info!("ℹ️  No existing candle data (normal for new setup)");
    }

    // Check timeframes
    let existing_tfs = sqlx::query(
            "SELECT DISTINCT timeframe, COUNT(*) as count FROM candles GROUP BY timeframe ORDER BY timeframe"
        )
        .fetch_all(candle_db.pool())
        .await?;

    if !existing_tfs.is_empty() {
      info!("⏰ Existing timeframes:");
      for row in existing_tfs {
        let tf: String = row.get("timeframe");
        let count: i64 = row.get("count");
        info!("   - {}: {} candles", tf, count);
      }
    }

    Ok(())
  }

  /// Test database connection
  pub async fn test_connection(&self) -> Result<()> {
    info!("🔍 Testing database connection...");

    // Simple connectivity test
    sqlx::query("SELECT 1").fetch_one(&self.pool).await?;

    info!("✅ Database connection test passed");
    Ok(())
  }

  /// Get database statistics
  pub async fn get_database_stats(&self) -> Result<DatabaseStats> {
    self.candle_db.get_database_stats().await
  }

  /// Create sample data for testing
  pub async fn create_sample_data(&self) -> Result<()> {
    info!("🧪 Creating sample data for testing...");

    let now = chrono::Utc::now();
    let mut sample_candles = Vec::new();

    // Sample prices for each token (in USDT)
    let token_prices = vec![
      (Token::BTC, 45000.0),
      (Token::ETH, 3000.0),
      (Token::SOL, 100.0),
      (Token::APTOS, 8.5),
    ];

    for (token, base_price) in token_prices {
      for i in 0..5 {
        let start_time = now - chrono::Duration::minutes(5 - i);
        let end_time = start_time + chrono::Duration::minutes(1);

        // Simulate some price movement
        let price_variation = (i as f64 - 2.0) * 0.01; // ±2% variation
        let open = base_price * (1.0 + price_variation);
        let high = open * 1.005; // 0.5% higher
        let low = open * 0.995; // 0.5% lower
        let close = open * (1.0 + price_variation * 0.5);
        let volume = 1000.0 + (i as f64 * 100.0);

        let candle = Candle {
          market_id: token.market_id().to_string(),
          timeframe: TimeFrame::M1,
          start_timestamp: start_time.timestamp(),
          end_timestamp: end_time.timestamp(),
          start_time,
          end_time,
          open,
          high,
          low,
          close,
          volume,
          tick_count: 50 + i as u64,
          vwap: (open + high + low + close) / 4.0,
          spread_avg: base_price * 0.0001, // 0.01% spread
          spread_min: base_price * 0.00005,
          spread_max: base_price * 0.0002,
          is_closed: true,
          metadata: CandleMetadata {
            created_timestamp: now.timestamp(),
            created_at: now,
            source: DataSource::WebSocketTick,
            quality_score: 0.95,
            gap_detected: false,
            volatility_z_score: Some(0.1),
            ws_sequence: None,
          },
        };
        sample_candles.push(candle);
      }
    }

    self.candle_db.save_candles_batch(&sample_candles).await?;
    info!("✅ Created {} sample candles", sample_candles.len());

    Ok(())
  }

  /// Health check for database
  pub async fn health_check(&self) -> Result<DatabaseHealthStatus> {
    let mut status = DatabaseHealthStatus::default();

    // Test basic connectivity
    match self.test_connection().await {
      Ok(_) => {
        status.connection_status = "healthy".to_string();
      }
      Err(e) => {
        status.connection_status = format!("error: {}", e);
        status.overall_health = "unhealthy".to_string();
        return Ok(status);
      }
    }

    // Check table existence
    let table_count = sqlx::query_scalar::<_, i64>(
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'",
    )
    .fetch_one(&self.pool)
    .await?;

    status.table_count = table_count as u64;

    // Check candle data
    if let Ok(stats) = self.get_database_stats().await {
      status.total_candles = stats.total_candles;
      status.unique_markets = stats.unique_markets;
      status.table_size = stats.table_size;
    }

    // Check each token
    for token in Token::all_tokens() {
      let count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM candles WHERE market_id = $1")
        .bind(token.market_id())
        .fetch_one(&self.pool)
        .await?;

      status
        .token_candle_counts
        .insert(token.symbol().to_string(), count as u64);
    }

    status.overall_health = "healthy".to_string();
    status.last_check = chrono::Utc::now();

    Ok(status)
  }
}

/// Database health status
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct DatabaseHealthStatus {
  pub overall_health: String,
  pub connection_status: String,
  pub table_count: u64,
  pub total_candles: u64,
  pub unique_markets: u64,
  pub table_size: String,
  pub token_candle_counts: std::collections::HashMap<String, u64>,
  pub last_check: chrono::DateTime<chrono::Utc>,
}

impl Default for DatabaseHealthStatus {
  fn default() -> Self {
    Self {
      overall_health: "unknown".to_string(),
      connection_status: "unknown".to_string(),
      table_count: 0,
      total_candles: 0,
      unique_markets: 0,
      table_size: "0 bytes".to_string(),
      token_candle_counts: std::collections::HashMap::new(),
      last_check: chrono::Utc::now(),
    }
  }
}

/// Mask password in database URL for logging
pub fn mask_password(url: &str) -> String {
  if let Some(start) = url.find("://") {
    if let Some(at_pos) = url[start + 3..].find('@') {
      let before = &url[..start + 3];
      let after = &url[start + 3 + at_pos..];
      if let Some(colon_pos) = url[start + 3..start + 3 + at_pos].find(':') {
        let user = &url[start + 3..start + 3 + colon_pos];
        return format!("{}{}:***{}", before, user, after);
      }
    }
  }
  url.to_string()
}

/// Database configuration
#[derive(Debug, Clone)]
pub struct DatabaseConfig {
  pub url: String,
  pub max_connections: u32,
  pub min_connections: u32,
  pub connection_timeout_secs: u64,
  pub idle_timeout_secs: u64,
}

impl DatabaseConfig {
  pub fn from_env() -> Result<Self> {
    let url = std::env::var("DATABASE_URL")
      .unwrap_or_else(|_| "postgresql://postgres:password@localhost:5432/trading_db".to_string());

    Ok(Self {
      url,
      max_connections: std::env::var("DB_MAX_CONNECTIONS")
        .unwrap_or_else(|_| "10".to_string())
        .parse()
        .unwrap_or(10),
      min_connections: std::env::var("DB_MIN_CONNECTIONS")
        .unwrap_or_else(|_| "1".to_string())
        .parse()
        .unwrap_or(1),
      connection_timeout_secs: std::env::var("DB_CONNECTION_TIMEOUT")
        .unwrap_or_else(|_| "30".to_string())
        .parse()
        .unwrap_or(30),
      idle_timeout_secs: std::env::var("DB_IDLE_TIMEOUT")
        .unwrap_or_else(|_| "600".to_string())
        .parse()
        .unwrap_or(600),
    })
  }

  /// Create connection pool with configuration
  pub async fn create_pool(&self) -> Result<PgPool> {
    use sqlx::postgres::PgPoolOptions;
    use std::time::Duration;

    let pool = PgPoolOptions::new()
      .max_connections(self.max_connections)
      .min_connections(self.min_connections)
      .acquire_timeout(Duration::from_secs(self.connection_timeout_secs))
      .idle_timeout(Duration::from_secs(self.idle_timeout_secs))
      .connect(&self.url)
      .await?;

    Ok(pool)
  }
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_mask_password() {
    let url = "postgresql://user:secret@localhost:5432/db";
    let masked = mask_password(url);
    assert_eq!(masked, "postgresql://user:***@localhost:5432/db");
  }

  #[test]
  fn test_database_config_from_env() {
    // Test default values
    std::env::remove_var("DATABASE_URL");
    std::env::remove_var("DB_MAX_CONNECTIONS");

    let config = DatabaseConfig::from_env().unwrap();
    assert_eq!(config.max_connections, 10);
    assert_eq!(config.min_connections, 1);
    assert!(config.url.contains("postgresql://"));
  }

  #[test]
  fn test_database_health_status_default() {
    let status = DatabaseHealthStatus::default();
    assert_eq!(status.overall_health, "unknown");
    assert_eq!(status.connection_status, "unknown");
    assert_eq!(status.table_count, 0);
  }
}
