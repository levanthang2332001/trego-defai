use super::types::*;
use anyhow::Result;
use chrono::{DateTime, Utc};
use sqlx::{PgPool, Row};

#[derive(Debug, Clone)]
pub struct CandleDatabase {
  pool: PgPool,
}

impl CandleDatabase {
  pub fn new(pool: PgPool) -> Self {
    Self { pool }
  }

  /// Get a reference to the database pool for direct queries
  pub fn pool(&self) -> &PgPool {
    &self.pool
  }

  /// Save a single candle to PostgreSQL - prioritize ws_candles table
  pub async fn save_candle(&self, candle: &Candle) -> Result<()> {
    // First try to save to ws_candles table (most efficient for real-time data)
    if let Ok(ws_candle) = self.convert_candle_to_websocket(candle) {
      if self.save_websocket_candle(&ws_candle).await.is_ok() {
        return Ok(());
      }
    }

    // Fallback to candles_v2 and candles tables
    let data_source_str = match &candle.metadata.source {
      DataSource::WebSocketTick => "websocket_tick".to_string(),
      DataSource::RestAPI => "rest_api".to_string(),
      DataSource::FileImport => "file_import".to_string(),
      DataSource::Aggregated(tf) => format!("aggregated_{}", tf),
    };

    // Try to use candles_v2 table first, fallback to old format
    let result = sqlx::query(
      r#"
            INSERT INTO candles_v2 (
                market_id, timeframe, start_timestamp, end_timestamp,
                open_price, high_price, low_price, close_price,
                volume, tick_count, vwap,
                spread_avg, spread_min, spread_max,
                is_closed, quality_score, gap_detected, volatility_z_score,
                data_source, created_timestamp, ws_sequence
            ) VALUES (
                $1, $2, $3, $4,
                $5, $6, $7, $8,
                $9, $10, $11,
                $12, $13, $14,
                $15, $16, $17, $18,
                $19, $20, $21
            ) ON CONFLICT (market_id, timeframe, start_timestamp)
            DO UPDATE SET
                end_timestamp = EXCLUDED.end_timestamp,
                open_price = EXCLUDED.open_price,
                high_price = EXCLUDED.high_price,
                low_price = EXCLUDED.low_price,
                close_price = EXCLUDED.close_price,
                volume = EXCLUDED.volume,
                tick_count = EXCLUDED.tick_count,
                vwap = EXCLUDED.vwap,
                spread_avg = EXCLUDED.spread_avg,
                spread_min = EXCLUDED.spread_min,
                spread_max = EXCLUDED.spread_max,
                is_closed = EXCLUDED.is_closed,
                quality_score = EXCLUDED.quality_score,
                gap_detected = EXCLUDED.gap_detected,
                volatility_z_score = EXCLUDED.volatility_z_score,
                ws_sequence = EXCLUDED.ws_sequence
            "#,
    )
    .bind(&candle.market_id)
    .bind(&candle.timeframe.to_string())
    .bind(&candle.start_timestamp)
    .bind(&candle.end_timestamp)
    .bind(&candle.open)
    .bind(&candle.high)
    .bind(&candle.low)
    .bind(&candle.close)
    .bind(&candle.volume)
    .bind(candle.tick_count as i64)
    .bind(&candle.vwap)
    .bind(&candle.spread_avg)
    .bind(&candle.spread_min)
    .bind(&candle.spread_max)
    .bind(&candle.is_closed)
    .bind(&candle.metadata.quality_score)
    .bind(&candle.metadata.gap_detected)
    .bind(&candle.metadata.volatility_z_score)
    .bind(&data_source_str)
    .bind(&candle.metadata.created_timestamp)
    .bind(&candle.metadata.ws_sequence.map(|s| s as i64))
    .execute(&self.pool)
    .await;

    // Fallback to old table format for backward compatibility
    if result.is_err() {
      sqlx::query(
        r#"
              INSERT INTO candles (
                  market_id, timeframe, start_time, end_time,
                  open_price, high_price, low_price, close_price,
                  volume, tick_count, vwap,
                  spread_avg, spread_min, spread_max,
                  is_closed, quality_score, gap_detected, volatility_z_score,
                  data_source, created_at
              ) VALUES (
                  $1, $2, $3, $4,
                  $5, $6, $7, $8,
                  $9, $10, $11,
                  $12, $13, $14,
                  $15, $16, $17, $18,
                  $19, $20
              ) ON CONFLICT (market_id, timeframe, start_time)
              DO UPDATE SET
                  end_time = EXCLUDED.end_time,
                  open_price = EXCLUDED.open_price,
                  high_price = EXCLUDED.high_price,
                  low_price = EXCLUDED.low_price,
                  close_price = EXCLUDED.close_price,
                  volume = EXCLUDED.volume,
                  tick_count = EXCLUDED.tick_count,
                  vwap = EXCLUDED.vwap,
                  spread_avg = EXCLUDED.spread_avg,
                  spread_min = EXCLUDED.spread_min,
                  spread_max = EXCLUDED.spread_max,
                  is_closed = EXCLUDED.is_closed,
                  quality_score = EXCLUDED.quality_score,
                  gap_detected = EXCLUDED.gap_detected,
                  volatility_z_score = EXCLUDED.volatility_z_score,
                  updated_at = NOW()
              "#,
      )
      .bind(&candle.market_id)
      .bind(&candle.timeframe.to_string())
      .bind(&candle.start_time)
      .bind(&candle.end_time)
      .bind(&candle.open)
      .bind(&candle.high)
      .bind(&candle.low)
      .bind(&candle.close)
      .bind(&candle.volume)
      .bind(candle.tick_count as i64)
      .bind(&candle.vwap)
      .bind(&candle.spread_avg)
      .bind(&candle.spread_min)
      .bind(&candle.spread_max)
      .bind(&candle.is_closed)
      .bind(&candle.metadata.quality_score)
      .bind(&candle.metadata.gap_detected)
      .bind(&candle.metadata.volatility_z_score)
      .bind(&data_source_str)
      .bind(&candle.metadata.created_at)
      .execute(&self.pool)
      .await?;
    }

    Ok(())
  }

  /// Save multiple candles in batch - prioritize ws_candles table
  pub async fn save_candles_batch(&self, candles: &[Candle]) -> Result<()> {
    if candles.is_empty() {
      return Ok(());
    }

    // Try to batch save to ws_candles first
    let mut ws_candles = Vec::new();
    let mut fallback_candles = Vec::new();

    for candle in candles {
      if let Ok(ws_candle) = self.convert_candle_to_websocket(candle) {
        ws_candles.push(ws_candle);
      } else {
        fallback_candles.push(candle);
      }
    }

    // Save ws_candles if any
    if !ws_candles.is_empty() {
      if let Err(e) = self.save_websocket_candles_batch(&ws_candles).await {
        tracing::warn!("Failed to batch save to ws_candles: {}, falling back to candles table", e);
        fallback_candles.extend(candles.iter());
      }
    }

    // Save remaining candles to fallback tables
    if !fallback_candles.is_empty() {
      let mut tx = self.pool.begin().await?;

    for candle in &fallback_candles {
      let data_source_str = match &candle.metadata.source {
        DataSource::WebSocketTick => "websocket_tick".to_string(),
        DataSource::RestAPI => "rest_api".to_string(),
        DataSource::FileImport => "file_import".to_string(),
        DataSource::Aggregated(tf) => format!("aggregated_{}", tf),
      };

      sqlx::query(
        r#"
                INSERT INTO candles (
                    market_id, timeframe, start_time, end_time,
                    open_price, high_price, low_price, close_price,
                    volume, tick_count, vwap,
                    spread_avg, spread_min, spread_max,
                    is_closed, quality_score, gap_detected, volatility_z_score,
                    data_source, created_at
                ) VALUES (
                    $1, $2, $3, $4,
                    $5, $6, $7, $8,
                    $9, $10, $11,
                    $12, $13, $14,
                    $15, $16, $17, $18,
                    $19, $20
                ) ON CONFLICT (market_id, timeframe, start_time)
                DO UPDATE SET
                    end_time = EXCLUDED.end_time,
                    open_price = EXCLUDED.open_price,
                    high_price = EXCLUDED.high_price,
                    low_price = EXCLUDED.low_price,
                    close_price = EXCLUDED.close_price,
                    volume = EXCLUDED.volume,
                    tick_count = EXCLUDED.tick_count,
                    vwap = EXCLUDED.vwap,
                    spread_avg = EXCLUDED.spread_avg,
                    spread_min = EXCLUDED.spread_min,
                    spread_max = EXCLUDED.spread_max,
                    is_closed = EXCLUDED.is_closed,
                    quality_score = EXCLUDED.quality_score,
                    gap_detected = EXCLUDED.gap_detected,
                    volatility_z_score = EXCLUDED.volatility_z_score,
                    updated_at = NOW()
                "#,
      )
      .bind(&candle.market_id)
      .bind(&candle.timeframe.to_string())
      .bind(&candle.start_time)
      .bind(&candle.end_time)
      .bind(&candle.open)
      .bind(&candle.high)
      .bind(&candle.low)
      .bind(&candle.close)
      .bind(&candle.volume)
      .bind(candle.tick_count as i64)
      .bind(&candle.vwap)
      .bind(&candle.spread_avg)
      .bind(&candle.spread_min)
      .bind(&candle.spread_max)
      .bind(&candle.is_closed)
      .bind(&candle.metadata.quality_score)
      .bind(&candle.metadata.gap_detected)
      .bind(&candle.metadata.volatility_z_score)
      .bind(&data_source_str)
      .bind(&candle.metadata.created_at)
      .execute(&mut *tx)
      .await?;
    }

    tx.commit().await?;
    }

    Ok(())
  }

  /// Load candles from database
  pub async fn load_candles(
    &self,
    market_id: &str,
    timeframe: TimeFrame,
    start_time: Option<DateTime<Utc>>,
    end_time: Option<DateTime<Utc>>,
    limit: Option<i64>,
  ) -> Result<Vec<Candle>> {
    // Use sqlx query builder to safely construct queries
    let mut query_builder = sqlx::QueryBuilder::new(
      "SELECT market_id, timeframe, start_time, end_time, open_price, high_price, low_price, close_price, volume, tick_count, vwap, spread_avg, spread_min, spread_max, is_closed, quality_score, gap_detected, volatility_z_score, data_source, created_at FROM candles WHERE market_id = "
    );
    query_builder.push_bind(market_id);
    query_builder.push(" AND timeframe = ");
    query_builder.push_bind(timeframe.to_string());

    if let Some(start) = start_time {
      query_builder.push(" AND start_time >= ");
      query_builder.push_bind(start);
    }

    if let Some(end) = end_time {
      query_builder.push(" AND start_time < ");
      query_builder.push_bind(end);
    }

    query_builder.push(" ORDER BY start_time ASC");

    if let Some(limit_val) = limit {
      query_builder.push(" LIMIT ");
      query_builder.push_bind(limit_val);
    }

    let query = query_builder.build();
    let rows = query.fetch_all(&self.pool).await?;
    self.parse_rows_to_candles(rows).await
  }

  /// Helper method to parse database rows into Candle objects
  async fn parse_rows_to_candles(&self, rows: Vec<sqlx::postgres::PgRow>) -> Result<Vec<Candle>> {
    let mut candles = Vec::new();
    for row in rows {
      let timeframe_str: String = row.get("timeframe");
      let timeframe = self.parse_timeframe(&timeframe_str)?;

      let data_source_str: String = row.get("data_source");
      let data_source = self.parse_data_source(&data_source_str)?;

      let candle = Candle {
        market_id: row.get("market_id"),
        timeframe,
        start_timestamp: row
          .get::<chrono::DateTime<chrono::Utc>, _>("start_time")
          .timestamp(),
        end_timestamp: row
          .get::<chrono::DateTime<chrono::Utc>, _>("end_time")
          .timestamp(),
        start_time: row.get("start_time"),
        end_time: row.get("end_time"),
        open: row.get("open_price"),
        high: row.get("high_price"),
        low: row.get("low_price"),
        close: row.get("close_price"),
        volume: row.get("volume"),
        tick_count: row.get::<i64, _>("tick_count") as u64,
        vwap: row.get("vwap"),
        spread_avg: row.get("spread_avg"),
        spread_min: row.get("spread_min"),
        spread_max: row.get("spread_max"),
        is_closed: row.get("is_closed"),
        metadata: CandleMetadata {
          created_timestamp: row
            .get::<chrono::DateTime<chrono::Utc>, _>("created_at")
            .timestamp(),
          created_at: row.get("created_at"),
          source: data_source,
          quality_score: row.get("quality_score"),
          gap_detected: row.get("gap_detected"),
          volatility_z_score: row.get("volatility_z_score"),
          ws_sequence: None,
        },
      };
      candles.push(candle);
    }

    Ok(candles)
  }

  /// Load latest N candles for a market/timeframe
  pub async fn load_latest_candles(
    &self,
    market_id: &str,
    timeframe: TimeFrame,
    count: i64,
  ) -> Result<Vec<Candle>> {
    let query_str = r#"
            SELECT
                market_id, timeframe, start_time, end_time,
                open_price, high_price, low_price, close_price,
                volume, tick_count, vwap,
                spread_avg, spread_min, spread_max,
                is_closed, quality_score, gap_detected, volatility_z_score,
                data_source, created_at
            FROM candles
            WHERE market_id = $1 AND timeframe = $2
            ORDER BY start_time DESC
            LIMIT $3
        "#;

    let rows = sqlx::query(query_str)
      .bind(market_id)
      .bind(timeframe.to_string())
      .bind(count)
      .fetch_all(&self.pool)
      .await?;

    let mut candles = Vec::new();
    for row in rows {
      let timeframe_str: String = row.get("timeframe");
      let timeframe = self.parse_timeframe(&timeframe_str)?;

      let data_source_str: String = row.get("data_source");
      let data_source = self.parse_data_source(&data_source_str)?;

      let candle = Candle {
        market_id: row.get("market_id"),
        timeframe,
        start_timestamp: row
          .get::<chrono::DateTime<chrono::Utc>, _>("start_time")
          .timestamp(),
        end_timestamp: row
          .get::<chrono::DateTime<chrono::Utc>, _>("end_time")
          .timestamp(),
        start_time: row.get("start_time"),
        end_time: row.get("end_time"),
        open: row.get("open_price"),
        high: row.get("high_price"),
        low: row.get("low_price"),
        close: row.get("close_price"),
        volume: row.get("volume"),
        tick_count: row.get::<i64, _>("tick_count") as u64,
        vwap: row.get("vwap"),
        spread_avg: row.get("spread_avg"),
        spread_min: row.get("spread_min"),
        spread_max: row.get("spread_max"),
        is_closed: row.get("is_closed"),
        metadata: CandleMetadata {
          created_timestamp: row
            .get::<chrono::DateTime<chrono::Utc>, _>("created_at")
            .timestamp(),
          created_at: row.get("created_at"),
          source: data_source,
          quality_score: row.get("quality_score"),
          gap_detected: row.get("gap_detected"),
          volatility_z_score: row.get("volatility_z_score"),
          ws_sequence: None,
        },
      };
      candles.push(candle);
    }

    // Reverse to return in chronological order (oldest first)
    candles.reverse();
    Ok(candles)
  }

  /// Delete old candles (for cleanup)
  pub async fn cleanup_old_candles(
    &self,
    market_id: &str,
    timeframe: TimeFrame,
    before: DateTime<Utc>,
  ) -> Result<u64> {
    let result = sqlx::query(
      "DELETE FROM candles WHERE market_id = $1 AND timeframe = $2 AND start_time < $3",
    )
    .bind(market_id)
    .bind(&timeframe.to_string())
    .bind(&before)
    .execute(&self.pool)
    .await?;

    Ok(result.rows_affected())
  }

  fn parse_timeframe(&self, s: &str) -> Result<TimeFrame> {
    match s {
      "tick" => Ok(TimeFrame::Tick),
      "1s" => Ok(TimeFrame::S1),
      "5s" => Ok(TimeFrame::S5),
      "15s" => Ok(TimeFrame::S15),
      "30s" => Ok(TimeFrame::S30),
      "1m" => Ok(TimeFrame::M1),
      "3m" => Ok(TimeFrame::M3),
      "5m" => Ok(TimeFrame::M5),
      "15m" => Ok(TimeFrame::M15),
      "30m" => Ok(TimeFrame::M30),
      "1h" => Ok(TimeFrame::H1),
      "2h" => Ok(TimeFrame::H2),
      "4h" => Ok(TimeFrame::H4),
      "6h" => Ok(TimeFrame::H6),
      "12h" => Ok(TimeFrame::H12),
      "1d" => Ok(TimeFrame::D1),
      "1w" => Ok(TimeFrame::W1),
      "1M" => Ok(TimeFrame::MN1),
      _ => Err(anyhow::anyhow!("Unknown timeframe: {}", s)),
    }
  }

  fn parse_data_source(&self, s: &str) -> Result<DataSource> {
    if s.starts_with("aggregated_") {
      let tf_str = s.strip_prefix("aggregated_").unwrap();
      let timeframe = self.parse_timeframe(tf_str)?;
      Ok(DataSource::Aggregated(timeframe))
    } else {
      match s {
        "websocket_tick" => Ok(DataSource::WebSocketTick),
        "rest_api" => Ok(DataSource::RestAPI),
        "file_import" => Ok(DataSource::FileImport),
        _ => Err(anyhow::anyhow!("Unknown data source: {}", s)),
      }
    }
  }

  /// Load candles for a specific token
  pub async fn load_token_candles(
    &self,
    token: &Token,
    timeframe: TimeFrame,
    start_time: Option<DateTime<Utc>>,
    end_time: Option<DateTime<Utc>>,
    limit: Option<i64>,
  ) -> Result<Vec<Candle>> {
    self
      .load_candles(token.market_id(), timeframe, start_time, end_time, limit)
      .await
  }

  /// Load latest candles for a specific token
  pub async fn load_latest_token_candles(
    &self,
    token: &Token,
    timeframe: TimeFrame,
    count: i64,
  ) -> Result<Vec<Candle>> {
    self
      .load_latest_candles(token.market_id(), timeframe, count)
      .await
  }

  /// Load candles for all supported tokens
  pub async fn load_all_tokens_candles(
    &self,
    timeframe: TimeFrame,
    start_time: Option<DateTime<Utc>>,
    end_time: Option<DateTime<Utc>>,
    limit: Option<i64>,
  ) -> Result<std::collections::HashMap<Token, Vec<Candle>>> {
    let mut results = std::collections::HashMap::new();

    for token in Token::all_tokens() {
      let candles = self
        .load_token_candles(&token, timeframe, start_time, end_time, limit)
        .await?;
      results.insert(token, candles);
    }

    Ok(results)
  }

  /// Get market summary for all tokens
  pub async fn get_tokens_market_summary(
    &self,
    timeframe: TimeFrame,
  ) -> Result<std::collections::HashMap<Token, MarketSummary>> {
    let mut summaries = std::collections::HashMap::new();

    for token in Token::all_tokens() {
      if let Ok(summary) = self.get_market_summary(token.market_id(), timeframe).await {
        summaries.insert(token, summary);
      }
    }

    Ok(summaries)
  }

  /// Get market summary for a specific market
  pub async fn get_market_summary(
    &self,
    market_id: &str,
    timeframe: TimeFrame,
  ) -> Result<MarketSummary> {
    let query_str = r#"
      SELECT
        COUNT(*) as candle_count,
        MIN(start_time) as first_candle,
        MAX(start_time) as last_candle,
        AVG(volume) as avg_volume,
        AVG(quality_score) as avg_quality,
        COUNT(CASE WHEN gap_detected = true THEN 1 END) as gaps_detected
      FROM candles
      WHERE market_id = $1 AND timeframe = $2
    "#;

    let row = sqlx::query(query_str)
      .bind(market_id)
      .bind(timeframe.to_string())
      .fetch_one(&self.pool)
      .await?;

    Ok(MarketSummary {
      market_id: market_id.to_string(),
      timeframe,
      candle_count: row.get::<i64, _>("candle_count") as u64,
      first_candle: row.get("first_candle"),
      last_candle: row.get("last_candle"),
      avg_volume: row.get("avg_volume"),
      avg_quality: row.get("avg_quality"),
      gaps_detected: row.get::<i64, _>("gaps_detected") as u64,
    })
  }

  /// Cleanup old candles for a specific token
  pub async fn cleanup_token_candles(
    &self,
    token: &Token,
    timeframe: TimeFrame,
    before: DateTime<Utc>,
  ) -> Result<u64> {
    self
      .cleanup_old_candles(token.market_id(), timeframe, before)
      .await
  }

  /// Cleanup old candles for all tokens
  pub async fn cleanup_all_tokens_candles(
    &self,
    timeframe: TimeFrame,
    before: DateTime<Utc>,
  ) -> Result<std::collections::HashMap<Token, u64>> {
    let mut results = std::collections::HashMap::new();

    for token in Token::all_tokens() {
      let deleted = self
        .cleanup_token_candles(&token, timeframe, before)
        .await?;
      results.insert(token, deleted);
    }

    Ok(results)
  }

  /// Save WebSocket candle directly (most efficient)
  pub async fn save_websocket_candle(&self, ws_candle: &WebSocketCandle) -> Result<()> {
    if !ws_candle.is_valid() {
      return Err(anyhow::anyhow!("Invalid WebSocket candle data"));
    }

    // Calculate end timestamp based on timeframe
    let timeframe_seconds = match ws_candle.timeframe.as_str() {
      "1s" => 1,
      "5s" => 5,
      "15s" => 15,
      "30s" => 30,
      "1m" => 60,
      "3m" => 180,
      "5m" => 300,
      "15m" => 900,
      "30m" => 1800,
      "1h" => 3600,
      "2h" => 7200,
      "4h" => 14400,
      "6h" => 21600,
      "12h" => 43200,
      "1d" => 86400,
      "1w" => 604800,
      "1M" => 2628000,
      _ => 60, // Default to 1 minute
    };

    let end_timestamp = ws_candle.timestamp + timeframe_seconds;

    // Try new table first, fallback to function call
    let result = sqlx::query(
      r#"
        INSERT INTO ws_candles (
            market_id, timeframe, timestamp_start, timestamp_end,
            open_price, high_price, low_price, close_price,
            volume, trade_count, vwap, ws_sequence
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
        ) ON CONFLICT (market_id, timeframe, timestamp_start)
        DO UPDATE SET
            timestamp_end = EXCLUDED.timestamp_end,
            open_price = EXCLUDED.open_price,
            high_price = EXCLUDED.high_price,
            low_price = EXCLUDED.low_price,
            close_price = EXCLUDED.close_price,
            volume = EXCLUDED.volume,
            trade_count = EXCLUDED.trade_count,
            vwap = EXCLUDED.vwap,
            ws_sequence = EXCLUDED.ws_sequence
        "#,
    )
    .bind(&ws_candle.market_id)
    .bind(&ws_candle.timeframe)
    .bind(&ws_candle.timestamp)
    .bind(&end_timestamp)
    .bind(&ws_candle.open)
    .bind(&ws_candle.high)
    .bind(&ws_candle.low)
    .bind(&ws_candle.close)
    .bind(&ws_candle.volume)
    .bind(&ws_candle.trade_count.map(|c| c as i64))
    .bind(&ws_candle.vwap)
    .bind(&ws_candle.sequence.map(|s| s as i64))
    .execute(&self.pool)
    .await;

    // Fallback to stored function if table doesn't exist
    if result.is_err() {
      sqlx::query("SELECT insert_ws_candle($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)")
        .bind(&ws_candle.market_id)
        .bind(&ws_candle.timeframe)
        .bind(&ws_candle.timestamp)
        .bind(&ws_candle.open)
        .bind(&ws_candle.high)
        .bind(&ws_candle.low)
        .bind(&ws_candle.close)
        .bind(&ws_candle.volume)
        .bind(&ws_candle.trade_count.map(|c| c as i64))
        .bind(&ws_candle.vwap)
        .bind(&ws_candle.sequence.map(|s| s as i64))
        .execute(&self.pool)
        .await?;
    }

    Ok(())
  }

  /// Save multiple WebSocket candles in batch
  pub async fn save_websocket_candles_batch(&self, ws_candles: &[WebSocketCandle]) -> Result<()> {
    if ws_candles.is_empty() {
      return Ok(());
    }

    let mut tx = self.pool.begin().await?;

    for ws_candle in ws_candles {
      if !ws_candle.is_valid() {
        continue; // Skip invalid candles
      }

      let timeframe_seconds = match ws_candle.timeframe.as_str() {
        "1s" => 1,
        "5s" => 5,
        "15s" => 15,
        "30s" => 30,
        "1m" => 60,
        "3m" => 180,
        "5m" => 300,
        "15m" => 900,
        "30m" => 1800,
        "1h" => 3600,
        "2h" => 7200,
        "4h" => 14400,
        "6h" => 21600,
        "12h" => 43200,
        "1d" => 86400,
        "1w" => 604800,
        "1M" => 2628000,
        _ => 60,
      };

      let end_timestamp = ws_candle.timestamp + timeframe_seconds;

      sqlx::query(
        r#"
          INSERT INTO ws_candles (
              market_id, timeframe, timestamp_start, timestamp_end,
              open_price, high_price, low_price, close_price,
              volume, trade_count, vwap, ws_sequence
          ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
          ) ON CONFLICT (market_id, timeframe, timestamp_start)
          DO UPDATE SET
              timestamp_end = EXCLUDED.timestamp_end,
              open_price = EXCLUDED.open_price,
              high_price = EXCLUDED.high_price,
              low_price = EXCLUDED.low_price,
              close_price = EXCLUDED.close_price,
              volume = EXCLUDED.volume,
              trade_count = EXCLUDED.trade_count,
              vwap = EXCLUDED.vwap,
              ws_sequence = EXCLUDED.ws_sequence
          "#,
      )
      .bind(&ws_candle.market_id)
      .bind(&ws_candle.timeframe)
      .bind(&ws_candle.timestamp)
      .bind(&end_timestamp)
      .bind(&ws_candle.open)
      .bind(&ws_candle.high)
      .bind(&ws_candle.low)
      .bind(&ws_candle.close)
      .bind(&ws_candle.volume)
      .bind(&ws_candle.trade_count.map(|c| c as i64))
      .bind(&ws_candle.vwap)
      .bind(&ws_candle.sequence.map(|s| s as i64))
      .execute(&mut *tx)
      .await?;
    }

    tx.commit().await?;
    Ok(())
  }

  /// Load WebSocket candles for a token
  pub async fn load_websocket_candles(
    &self,
    token: &Token,
    timeframe: &str,
    start_timestamp: Option<i64>,
    end_timestamp: Option<i64>,
    limit: Option<i64>,
  ) -> Result<Vec<WebSocketCandle>> {
    let mut query_builder = sqlx::QueryBuilder::new(
      "SELECT market_id, timeframe, timestamp_start, open_price, high_price, low_price, close_price, volume, trade_count, vwap, ws_sequence FROM ws_candles WHERE market_id = "
    );
    query_builder.push_bind(token.market_id());
    query_builder.push(" AND timeframe = ");
    query_builder.push_bind(timeframe);

    if let Some(start) = start_timestamp {
      query_builder.push(" AND timestamp_start >= ");
      query_builder.push_bind(start);
    }

    if let Some(end) = end_timestamp {
      query_builder.push(" AND timestamp_start < ");
      query_builder.push_bind(end);
    }

    query_builder.push(" ORDER BY timestamp_start ASC");

    if let Some(limit_val) = limit {
      query_builder.push(" LIMIT ");
      query_builder.push_bind(limit_val);
    }

    let query = query_builder.build();
    let rows = query.fetch_all(&self.pool).await?;

    let mut ws_candles = Vec::new();
    for row in rows {
      let ws_candle = WebSocketCandle {
        market_id: row.get("market_id"),
        timeframe: row.get("timeframe"),
        timestamp: row.get("timestamp_start"),
        open: row.get("open_price"),
        high: row.get("high_price"),
        low: row.get("low_price"),
        close: row.get("close_price"),
        volume: row.get("volume"),
        trade_count: row.get::<Option<i64>, _>("trade_count").map(|c| c as u64),
        vwap: row.get("vwap"),
        sequence: row.get::<Option<i64>, _>("ws_sequence").map(|s| s as u64),
      };
      ws_candles.push(ws_candle);
    }

    Ok(ws_candles)
  }

  /// Convert a Candle to WebSocketCandle for efficient storage
  fn convert_candle_to_websocket(&self, candle: &Candle) -> Result<WebSocketCandle> {
    // Validate that market_id is supported by ws_candles table
    if !["14", "15", "16", "31"].contains(&candle.market_id.as_str()) {
      return Err(anyhow::anyhow!("Market ID {} not supported by ws_candles table", candle.market_id));
    }

    // Convert timeframe to ws_candles compatible format
    let timeframe_str = match candle.timeframe {
      TimeFrame::S1 => "1s",
      TimeFrame::S5 => "5s", 
      TimeFrame::S15 => "15s",
      TimeFrame::S30 => "30s",
      TimeFrame::M1 => "1m",
      TimeFrame::M3 => "3m",
      TimeFrame::M5 => "5m",
      TimeFrame::M15 => "15m",
      TimeFrame::M30 => "30m",
      TimeFrame::H1 => "1h",
      TimeFrame::H2 => "2h",
      TimeFrame::H4 => "4h",
      TimeFrame::H6 => "6h",
      TimeFrame::H12 => "12h",
      TimeFrame::D1 => "1d",
      TimeFrame::W1 => "1w",
      TimeFrame::MN1 => "1M",
      _ => return Err(anyhow::anyhow!("Timeframe {:?} not supported by ws_candles table", candle.timeframe)),
    };

    Ok(WebSocketCandle {
      market_id: candle.market_id.clone(),
      timeframe: timeframe_str.to_string(),
      timestamp: candle.start_timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      trade_count: Some(candle.tick_count),
      vwap: Some(candle.vwap),
      sequence: candle.metadata.ws_sequence,
    })
  }

  /// Get database statistics
  pub async fn get_database_stats(&self) -> Result<DatabaseStats> {
    let query_str = r#"
      SELECT
        COUNT(*) as total_candles,
        COUNT(DISTINCT market_id) as unique_markets,
        COUNT(DISTINCT timeframe) as unique_timeframes,
        MIN(created_at) as oldest_record,
        MAX(created_at) as newest_record,
        pg_size_pretty(pg_total_relation_size('candles')) as table_size
      FROM candles
    "#;

    let row = sqlx::query(query_str).fetch_one(&self.pool).await?;

    Ok(DatabaseStats {
      total_candles: row.get::<i64, _>("total_candles") as u64,
      unique_markets: row.get::<i64, _>("unique_markets") as u64,
      unique_timeframes: row.get::<i64, _>("unique_timeframes") as u64,
      oldest_record: row.get("oldest_record"),
      newest_record: row.get("newest_record"),
      table_size: row.get("table_size"),
    })
  }
}
