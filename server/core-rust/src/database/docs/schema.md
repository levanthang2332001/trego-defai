# Database Schema - Multi-Token Candles System

Tài liệu chi tiết về database schema cho hệ thống lưu trữ dữ liệu nến của 4 tokens: **BTC**, **ETH**, **SOL**, và **APTOS**.

## 📊 Schema Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    TRADING DATABASE                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │    BTC      │    │    ETH      │    │    SOL      │     │
│  │ Market: 15  │    │ Market: 16  │    │ Market: 31  │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                             │
│                    ┌─────────────┐                         │
│                    │   APTOS     │                         │
│                    │ Market: 14  │                         │
│                    └─────────────┘                         │
│                                                             │
│                           ↓                                │
│                    ┌─────────────┐                         │
│                    │   CANDLES   │                         │
│                    │   TABLE     │                         │
│                    └─────────────┘                         │
└─────────────────────────────────────────────────────────────┘
```

## 🏗️ Main Table: `candles`

### Table Definition

```sql
CREATE TABLE IF NOT EXISTS candles (
    id BIGSERIAL PRIMARY KEY,
    market_id VARCHAR(50) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    open_price DECIMAL(20,8) NOT NULL,
    high_price DECIMAL(20,8) NOT NULL,
    low_price DECIMAL(20,8) NOT NULL,
    close_price DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8) NOT NULL DEFAULT 0,
    tick_count BIGINT NOT NULL DEFAULT 0,
    vwap DECIMAL(20,8) NOT NULL DEFAULT 0,
    spread_avg DECIMAL(20,8) NOT NULL DEFAULT 0,
    spread_min DECIMAL(20,8) NOT NULL DEFAULT 0,
    spread_max DECIMAL(20,8) NOT NULL DEFAULT 0,
    is_closed BOOLEAN NOT NULL DEFAULT true,
    quality_score DECIMAL(3,2) NOT NULL DEFAULT 1.0 CHECK (quality_score >= 0 AND quality_score <= 1),
    gap_detected BOOLEAN NOT NULL DEFAULT false,
    volatility_z_score DECIMAL(10,6),
    data_source VARCHAR(50) NOT NULL DEFAULT 'websocket_tick',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Column Descriptions

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| `id` | BIGSERIAL | Primary key, auto-increment | 1, 2, 3... |
| `market_id` | VARCHAR(50) | Token market identifier | "15" (BTC), "16" (ETH), "31" (SOL), "14" (APTOS) |
| `timeframe` | VARCHAR(10) | Time interval for candle | "1m", "5m", "1h", "1d" |
| `start_time` | TIMESTAMPTZ | Candle start timestamp (UTC) | 2024-01-01 12:00:00+00 |
| `end_time` | TIMESTAMPTZ | Candle end timestamp (UTC) | 2024-01-01 12:01:00+00 |
| `open_price` | DECIMAL(20,8) | Opening price | 45000.12345678 |
| `high_price` | DECIMAL(20,8) | Highest price in period | 45500.87654321 |
| `low_price` | DECIMAL(20,8) | Lowest price in period | 44800.11111111 |
| `close_price` | DECIMAL(20,8) | Closing price | 45200.99999999 |
| `volume` | DECIMAL(20,8) | Trading volume | 1250.50000000 |
| `tick_count` | BIGINT | Number of price ticks | 1200 |
| `vwap` | DECIMAL(20,8) | Volume Weighted Average Price | 45150.25000000 |
| `spread_avg` | DECIMAL(20,8) | Average bid-ask spread | 4.50000000 |
| `spread_min` | DECIMAL(20,8) | Minimum spread in period | 2.25000000 |
| `spread_max` | DECIMAL(20,8) | Maximum spread in period | 9.00000000 |
| `is_closed` | BOOLEAN | Candle completion status | true, false |
| `quality_score` | DECIMAL(3,2) | Data quality score (0.0-1.0) | 0.95 |
| `gap_detected` | BOOLEAN | Price gap detection flag | false |
| `volatility_z_score` | DECIMAL(10,6) | Volatility anomaly score | 0.123456 |
| `data_source` | VARCHAR(50) | Source of the data | "websocket_tick", "rest_api" |
| `created_at` | TIMESTAMPTZ | Record creation time | 2024-01-01 12:01:30+00 |
| `updated_at` | TIMESTAMPTZ | Last update time | 2024-01-01 12:01:30+00 |

## 🔍 Indexes

### Primary Indexes

```sql
-- Primary key
CREATE INDEX candles_pkey ON candles(id);

-- Unique constraint to prevent duplicates
CREATE UNIQUE INDEX idx_candles_unique 
    ON candles(market_id, timeframe, start_time);
```

### Performance Indexes

```sql
-- Basic market + timeframe queries
CREATE INDEX idx_candles_market_timeframe 
    ON candles(market_id, timeframe);

-- Time-based queries
CREATE INDEX idx_candles_start_time 
    ON candles(start_time);

-- Optimized time-series queries
CREATE INDEX idx_candles_market_timeframe_time 
    ON candles(market_id, timeframe, start_time);

-- Token-specific optimized queries
CREATE INDEX idx_candles_token_timeframe_time 
    ON candles(market_id, timeframe, start_time DESC, volume DESC);

-- High-volume queries
CREATE INDEX idx_candles_volume_desc 
    ON candles(volume DESC, start_time DESC) 
    WHERE volume > 0;

-- Data quality analysis
CREATE INDEX idx_candles_quality_analysis 
    ON candles(market_id, timeframe, quality_score, gap_detected);

-- Recent data optimization (last 30 days)
CREATE INDEX idx_candles_recent_data 
    ON candles(market_id, timeframe, start_time DESC)
    WHERE start_time >= NOW() - INTERVAL '30 days';

-- Data source analysis
CREATE INDEX idx_candles_data_source 
    ON candles(data_source, market_id, start_time);

-- Cleanup operations
CREATE INDEX idx_candles_cleanup 
    ON candles(market_id, timeframe, start_time) 
    WHERE is_closed = true;
```

## ✅ Constraints

### Data Validation Constraints

```sql
-- Quality score must be between 0 and 1
ALTER TABLE candles ADD CONSTRAINT chk_candles_quality_score 
    CHECK (quality_score >= 0 AND quality_score <= 1);

-- Volume must be non-negative
ALTER TABLE candles ADD CONSTRAINT chk_candles_positive_volume 
    CHECK (volume >= 0);

-- All prices must be positive
ALTER TABLE candles ADD CONSTRAINT chk_candles_valid_prices 
    CHECK (open_price > 0 AND high_price > 0 AND low_price > 0 AND close_price > 0);

-- Price relationships must be logical
ALTER TABLE candles ADD CONSTRAINT chk_candles_price_relationships 
    CHECK (high_price >= open_price AND high_price >= close_price AND 
           low_price <= open_price AND low_price <= close_price);

-- Time ordering must be correct
ALTER TABLE candles ADD CONSTRAINT chk_candles_time_order 
    CHECK (end_time >= start_time);
```

## 🔧 Functions

### Utility Functions

```sql
-- Get token symbol from market_id
CREATE OR REPLACE FUNCTION get_token_symbol(market_id_param TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN CASE market_id_param
        WHEN '15' THEN 'BTC'
        WHEN '16' THEN 'ETH'
        WHEN '31' THEN 'SOL'
        WHEN '14' THEN 'APT'
        ELSE 'UNKNOWN'
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
```

## 📊 Views

### `candles_with_tokens` View

```sql
CREATE OR REPLACE VIEW candles_with_tokens AS
SELECT 
    c.*,
    get_token_symbol(c.market_id) as token_symbol,
    CASE c.market_id
        WHEN '15' THEN 'Bitcoin'
        WHEN '16' THEN 'Ethereum'
        WHEN '31' THEN 'Solana'
        WHEN '14' THEN 'Aptos'
        ELSE 'Unknown'
    END as token_name
FROM candles c;
```

### `market_summaries` Materialized View

```sql
CREATE MATERIALIZED VIEW IF NOT EXISTS market_summaries AS
SELECT 
    market_id,
    get_token_symbol(market_id) as token_symbol,
    timeframe,
    COUNT(*) as candle_count,
    MIN(start_time) as first_candle,
    MAX(start_time) as last_candle,
    AVG(volume) as avg_volume,
    MAX(volume) as max_volume,
    AVG(quality_score) as avg_quality,
    COUNT(CASE WHEN gap_detected = true THEN 1 END) as gaps_detected,
    AVG(close_price) as avg_price,
    MAX(high_price) as max_price,
    MIN(low_price) as min_price,
    NOW() as last_updated
FROM candles 
GROUP BY market_id, timeframe;

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_market_summaries()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY market_summaries;
END;
$$ LANGUAGE plpgsql;
```

## 🔄 Triggers

### Auto-Update Timestamp

```sql
CREATE TRIGGER update_candles_updated_at 
    BEFORE UPDATE ON candles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

## 🪙 Token Mapping

### Market ID to Token Mapping

```sql
-- Function to validate market_id
CREATE OR REPLACE FUNCTION is_valid_market_id(market_id_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN market_id_param IN ('15', '16', '31', '14');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Token information view
CREATE OR REPLACE VIEW token_info AS
SELECT 
    market_id,
    token_symbol,
    token_name,
    CASE market_id
        WHEN '15' THEN 8   -- BTC decimals
        WHEN '16' THEN 18  -- ETH decimals
        WHEN '31' THEN 9   -- SOL decimals
        WHEN '14' THEN 8   -- APTOS decimals
    END as decimals,
    market_id || '-USDT' as default_pair
FROM (
    VALUES 
        ('15', 'BTC', 'Bitcoin'),
        ('16', 'ETH', 'Ethereum'),
        ('31', 'SOL', 'Solana'),
        ('14', 'APT', 'Aptos')
) AS t(market_id, token_symbol, token_name);
```

## ⏰ TimeFrame Definitions

### Supported TimeFrames

```sql
-- TimeFrame validation function
CREATE OR REPLACE FUNCTION is_valid_timeframe(tf_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN tf_param IN (
        'tick', '1s', '5s', '15s', '30s',
        '1m', '3m', '5m', '15m', '30m',
        '1h', '2h', '4h', '6h', '12h',
        '1d', '1w', '1M'
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- TimeFrame duration in seconds
CREATE OR REPLACE FUNCTION timeframe_duration_seconds(tf_param TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE tf_param
        WHEN 'tick' THEN 0
        WHEN '1s' THEN 1
        WHEN '5s' THEN 5
        WHEN '15s' THEN 15
        WHEN '30s' THEN 30
        WHEN '1m' THEN 60
        WHEN '3m' THEN 180
        WHEN '5m' THEN 300
        WHEN '15m' THEN 900
        WHEN '30m' THEN 1800
        WHEN '1h' THEN 3600
        WHEN '2h' THEN 7200
        WHEN '4h' THEN 14400
        WHEN '6h' THEN 21600
        WHEN '12h' THEN 43200
        WHEN '1d' THEN 86400
        WHEN '1w' THEN 604800
        WHEN '1M' THEN 2628000
        ELSE NULL
    END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

## 📈 Performance Considerations

### Query Optimization Tips

1. **Use Market ID + TimeFrame Indexes**
   ```sql
   -- Good: Uses idx_candles_market_timeframe_time
   SELECT * FROM candles 
   WHERE market_id = '15' AND timeframe = '1h'
   ORDER BY start_time DESC LIMIT 100;
   ```

2. **Leverage Recent Data Index**
   ```sql
   -- Good: Uses idx_candles_recent_data for recent queries
   SELECT * FROM candles 
   WHERE market_id = '16' 
     AND start_time >= NOW() - INTERVAL '7 days';
   ```

3. **Use Materialized Views for Analytics**
   ```sql
   -- Good: Pre-computed statistics
   SELECT * FROM market_summaries 
   WHERE token_symbol = 'BTC' AND timeframe = '1h';
   ```

### Index Usage Examples

```sql
-- Explain query plans
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM candles 
WHERE market_id = '15' AND timeframe = '1h'
ORDER BY start_time DESC LIMIT 100;
```

## 🧹 Maintenance

### Regular Maintenance Tasks

```sql
-- Update table statistics
ANALYZE candles;

-- Refresh materialized views
SELECT refresh_market_summaries();

-- Check index usage
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats 
WHERE tablename = 'candles';

-- Monitor table size
SELECT pg_size_pretty(pg_total_relation_size('candles')) as table_size;
```

### Cleanup Operations

```sql
-- Remove old data (example: older than 90 days)
DELETE FROM candles 
WHERE created_at < NOW() - INTERVAL '90 days'
  AND timeframe IN ('1s', '5s', '15s', '30s');

-- Vacuum after large deletions
VACUUM ANALYZE candles;
```

## 📊 Sample Queries

### Basic Token Queries

```sql
-- Get latest BTC hourly candles
SELECT * FROM candles_with_tokens 
WHERE token_symbol = 'BTC' AND timeframe = '1h'
ORDER BY start_time DESC LIMIT 24;

-- Volume leaders in last 24 hours
SELECT token_symbol, SUM(volume) as total_volume
FROM candles_with_tokens 
WHERE timeframe = '1h' 
  AND start_time >= NOW() - INTERVAL '24 hours'
GROUP BY token_symbol
ORDER BY total_volume DESC;
```

### Analytics Queries

```sql
-- Price volatility analysis
SELECT 
    token_symbol,
    timeframe,
    AVG(ABS(close_price - open_price) / open_price * 100) as avg_volatility_pct
FROM candles_with_tokens
WHERE start_time >= NOW() - INTERVAL '7 days'
GROUP BY token_symbol, timeframe
ORDER BY token_symbol, timeframe;

-- Data quality report
SELECT 
    token_symbol,
    COUNT(*) as total_candles,
    AVG(quality_score) as avg_quality,
    COUNT(CASE WHEN gap_detected THEN 1 END) as gaps_detected,
    COUNT(CASE WHEN quality_score < 0.9 THEN 1 END) as low_quality_candles
FROM candles_with_tokens
GROUP BY token_symbol;
```

## 🔒 Security Considerations

### Access Control

```sql
-- Create read-only user for analytics
CREATE USER analytics_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE trading_db TO analytics_user;
GRANT USAGE ON SCHEMA public TO analytics_user;
GRANT SELECT ON candles TO analytics_user;
GRANT SELECT ON candles_with_tokens TO analytics_user;
GRANT SELECT ON market_summaries TO analytics_user;

-- Create application user with full access
CREATE USER app_user WITH PASSWORD 'secure_app_password';
GRANT ALL PRIVILEGES ON DATABASE trading_db TO app_user;
GRANT ALL ON SCHEMA public TO app_user;
GRANT ALL ON ALL TABLES IN SCHEMA public TO app_user;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

### Row Level Security (Optional)

```sql
-- Enable RLS for additional security
ALTER TABLE candles ENABLE ROW LEVEL SECURITY;

-- Example policy: Users can only see data from last 30 days
CREATE POLICY candles_recent_data_policy ON candles
    FOR SELECT
    TO analytics_user
    USING (start_time >= NOW() - INTERVAL '30 days');
```

This schema provides a robust foundation for storing and analyzing multi-token candle data with optimal performance and data integrity.
