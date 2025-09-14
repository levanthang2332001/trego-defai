-- Optimized WebSocket candles storage with partitioning and advanced constraints
-- High-performance design for time-series data with validation

-- Create partitioned table for WebSocket candles
CREATE TABLE IF NOT EXISTS ws_candles (
    id BIGSERIAL,
    market_id VARCHAR(10) NOT NULL,           -- '15'=BTC, '16'=ETH, '31'=SOL, '14'=APTOS
    timeframe VARCHAR(10) NOT NULL,           -- '1s', '5s', '1m', '5m', '1h', etc.
    timestamp_start BIGINT NOT NULL,          -- Unix timestamp from WebSocket
    timestamp_end BIGINT NOT NULL,            -- Calculated end timestamp
    open_price DECIMAL(20,8) NOT NULL,        -- OHLC from WebSocket
    high_price DECIMAL(20,8) NOT NULL,
    low_price DECIMAL(20,8) NOT NULL,
    close_price DECIMAL(20,8) NOT NULL,
    volume DECIMAL(20,8) NOT NULL DEFAULT 0,  -- Volume from WebSocket
    trade_count BIGINT NOT NULL DEFAULT 0,    -- Number of trades
    vwap DECIMAL(20,8),                       -- VWAP if provided
    is_closed BOOLEAN NOT NULL DEFAULT true,  -- Candle completion status
    ws_sequence BIGINT,                       -- WebSocket sequence for ordering
    received_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT),

    -- Enhanced constraints with specific validations
    CONSTRAINT ws_candles_valid_market CHECK (market_id IN ('14', '15', '16', '31')),
    CONSTRAINT ws_candles_valid_timeframe CHECK (
        timeframe IN ('1s', '5s', '15s', '30s', '1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '1w', '1M')
    ),
    CONSTRAINT ws_candles_valid_prices CHECK (
        open_price > 0 AND high_price > 0 AND low_price > 0 AND close_price > 0
    ),
    CONSTRAINT ws_candles_price_logic CHECK (
        high_price >= GREATEST(open_price, close_price) AND
        low_price <= LEAST(open_price, close_price)
    ),
    CONSTRAINT ws_candles_time_order CHECK (timestamp_end >= timestamp_start),
    CONSTRAINT ws_candles_positive_volume CHECK (volume >= 0),
    CONSTRAINT ws_candles_reasonable_prices CHECK (
        high_price <= open_price * 10 AND low_price >= open_price * 0.1
    )
) PARTITION BY RANGE (timestamp_start);

-- Create partitions for current and future months (auto-managed)
DO $$
DECLARE
    start_date BIGINT;
    end_date BIGINT;
    partition_name TEXT;
    i INTEGER;
BEGIN
    -- Create partitions for last 3 months, current month, and next 6 months
    FOR i IN -3..6 LOOP
        start_date := EXTRACT(EPOCH FROM date_trunc('month', NOW() + (i || ' month')::INTERVAL))::BIGINT;
        end_date := EXTRACT(EPOCH FROM date_trunc('month', NOW() + ((i + 1) || ' month')::INTERVAL))::BIGINT;
        partition_name := 'ws_candles_' || to_char(NOW() + (i || ' month')::INTERVAL, 'YYYY_MM');

        EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF ws_candles FOR VALUES FROM (%L) TO (%L)',
                      partition_name, start_date, end_date);
    END LOOP;
END $$;

-- Optimized indexes for partitioned table
CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_candles_unique
    ON ws_candles(market_id, timeframe, timestamp_start);

CREATE INDEX IF NOT EXISTS idx_ws_candles_market_tf
    ON ws_candles(market_id, timeframe)
    INCLUDE (timestamp_start, close_price, volume);

CREATE INDEX IF NOT EXISTS idx_ws_candles_recent_prices
    ON ws_candles(market_id, timestamp_start DESC, close_price)
    WHERE timestamp_start >= (EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days'))::BIGINT;

CREATE INDEX IF NOT EXISTS idx_ws_candles_volume_leaders
    ON ws_candles(market_id, timeframe, volume DESC, timestamp_start DESC)
    WHERE volume > 1000;

CREATE INDEX IF NOT EXISTS idx_ws_candles_sequence
    ON ws_candles(ws_sequence, market_id)
    WHERE ws_sequence IS NOT NULL;

-- Function to convert Unix timestamp to readable format
CREATE OR REPLACE FUNCTION unix_to_datetime(unix_timestamp BIGINT)
RETURNS TIMESTAMPTZ AS $$
BEGIN
    RETURN to_timestamp(unix_timestamp) AT TIME ZONE 'UTC';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- View with readable timestamps for debugging
CREATE OR REPLACE VIEW ws_candles_readable AS
SELECT
    id,
    market_id,
    CASE market_id
        WHEN '15' THEN 'BTC'
        WHEN '16' THEN 'ETH'
        WHEN '31' THEN 'SOL'
        WHEN '14' THEN 'APTOS'
        ELSE 'Unknown'
    END as token_symbol,
    timeframe,
    timestamp_start,
    timestamp_end,
    unix_to_datetime(timestamp_start) as start_time_readable,
    unix_to_datetime(timestamp_end) as end_time_readable,
    open_price,
    high_price,
    low_price,
    close_price,
    volume,
    trade_count,
    vwap,
    is_closed,
    ws_sequence,
    unix_to_datetime(received_at) as received_at_readable
FROM ws_candles;

-- Enhanced materialized view for comprehensive token statistics
CREATE MATERIALIZED VIEW IF NOT EXISTS ws_token_stats AS
SELECT
    market_id,
    CASE market_id
        WHEN '15' THEN 'BTC'
        WHEN '16' THEN 'ETH'
        WHEN '31' THEN 'SOL'
        WHEN '14' THEN 'APTOS'
        ELSE 'UNKNOWN'
    END as token_symbol,
    timeframe,
    COUNT(*) as candle_count,
    COUNT(*) FILTER (WHERE is_closed = true) as closed_candle_count,
    MIN(timestamp_start) as first_timestamp,
    MAX(timestamp_start) as last_timestamp,
    AVG(volume) as avg_volume,
    MAX(volume) as max_volume,
    SUM(volume) as total_volume,
    AVG(close_price) as avg_price,
    MAX(high_price) as max_price,
    MIN(low_price) as min_price,
    STDDEV(close_price) as price_volatility,
    AVG(trade_count) as avg_trade_count,
    EXTRACT(EPOCH FROM NOW())::BIGINT as last_updated_timestamp
FROM ws_candles
WHERE timestamp_start >= EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')::BIGINT
GROUP BY market_id, timeframe;

CREATE UNIQUE INDEX IF NOT EXISTS idx_ws_token_stats_unique
    ON ws_token_stats(market_id, timeframe);

-- Auto-refresh trigger for materialized view
CREATE OR REPLACE FUNCTION refresh_stats_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Only refresh for significant volume changes or new timeframes
    IF (TG_OP = 'INSERT' AND NEW.volume > 1000) OR
       (TG_OP = 'UPDATE' AND ABS(NEW.volume - OLD.volume) > 100) OR
       (TG_OP = 'INSERT' AND NEW.is_closed = true) THEN
        -- Refresh asynchronously to avoid blocking
        PERFORM pg_notify('refresh_stats', NEW.market_id || ':' || NEW.timeframe);
    END IF;
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ws_candles_stats_trigger
    AFTER INSERT OR UPDATE ON ws_candles
    FOR EACH ROW EXECUTE FUNCTION refresh_stats_trigger();

-- Function to refresh statistics (can be called manually or by scheduler)
CREATE OR REPLACE FUNCTION refresh_ws_token_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY ws_token_stats;
    RAISE NOTICE 'Token statistics refreshed at %', NOW();
END;
$$ LANGUAGE plpgsql;

-- Enhanced batch insertion function for high-frequency WebSocket data
CREATE OR REPLACE FUNCTION insert_ws_candles_batch(
    candles_data JSONB[]
) RETURNS TABLE(inserted_count INTEGER, updated_count INTEGER, error_count INTEGER) AS $$
DECLARE
    inserted_cnt INTEGER := 0;
    updated_cnt INTEGER := 0;
    error_cnt INTEGER := 0;
    candle_data JSONB;
    timeframe_seconds BIGINT;
    calculated_end_ts BIGINT;
BEGIN
    FOREACH candle_data IN ARRAY candles_data
    LOOP
        BEGIN
            -- Calculate timeframe duration
            timeframe_seconds := CASE (candle_data->>'timeframe')
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
                ELSE 60
            END;

            calculated_end_ts := (candle_data->>'timestamp_start')::BIGINT + timeframe_seconds;

            WITH upsert AS (
                INSERT INTO ws_candles (
                    market_id, timeframe, timestamp_start, timestamp_end,
                    open_price, high_price, low_price, close_price,
                    volume, trade_count, vwap, ws_sequence, is_closed
                ) VALUES (
                    candle_data->>'market_id',
                    candle_data->>'timeframe',
                    (candle_data->>'timestamp_start')::BIGINT,
                    calculated_end_ts,
                    (candle_data->>'open_price')::DECIMAL(20,8),
                    (candle_data->>'high_price')::DECIMAL(20,8),
                    (candle_data->>'low_price')::DECIMAL(20,8),
                    (candle_data->>'close_price')::DECIMAL(20,8),
                    COALESCE((candle_data->>'volume')::DECIMAL(20,8), 0),
                    COALESCE((candle_data->>'trade_count')::BIGINT, 1),
                    COALESCE(
                        (candle_data->>'vwap')::DECIMAL(20,8),
                        ((candle_data->>'open_price')::DECIMAL + (candle_data->>'high_price')::DECIMAL +
                         (candle_data->>'low_price')::DECIMAL + (candle_data->>'close_price')::DECIMAL) / 4
                    ),
                    (candle_data->>'ws_sequence')::BIGINT,
                    COALESCE((candle_data->>'is_closed')::BOOLEAN, true)
                ) ON CONFLICT (market_id, timeframe, timestamp_start)
                DO UPDATE SET
                    timestamp_end = EXCLUDED.timestamp_end,
                    high_price = GREATEST(ws_candles.high_price, EXCLUDED.high_price),
                    low_price = LEAST(ws_candles.low_price, EXCLUDED.low_price),
                    close_price = EXCLUDED.close_price,
                    volume = ws_candles.volume + EXCLUDED.volume,
                    trade_count = ws_candles.trade_count + EXCLUDED.trade_count,
                    vwap = EXCLUDED.vwap,
                    ws_sequence = COALESCE(EXCLUDED.ws_sequence, ws_candles.ws_sequence),
                    is_closed = EXCLUDED.is_closed,
                    received_at = EXTRACT(EPOCH FROM NOW())::BIGINT
                RETURNING (CASE WHEN xmax = 0 THEN 'INSERT' ELSE 'UPDATE' END) AS action
            )
            SELECT CASE WHEN action = 'INSERT' THEN 1 ELSE 0 END,
                   CASE WHEN action = 'UPDATE' THEN 1 ELSE 0 END
            INTO inserted_cnt, updated_cnt
            FROM upsert;

        EXCEPTION WHEN OTHERS THEN
            error_cnt := error_cnt + 1;
            RAISE WARNING 'Error processing candle data: %', SQLERRM;
        END;
    END LOOP;

    RETURN QUERY SELECT inserted_cnt, updated_cnt, error_cnt;
END;
$$ LANGUAGE plpgsql;

-- Legacy single-candle insert function (optimized)
CREATE OR REPLACE FUNCTION insert_ws_candle(
    p_market_id TEXT,
    p_timeframe TEXT,
    p_timestamp_start BIGINT,
    p_open_price DECIMAL(20,8),
    p_high_price DECIMAL(20,8),
    p_low_price DECIMAL(20,8),
    p_close_price DECIMAL(20,8),
    p_volume DECIMAL(20,8) DEFAULT 0,
    p_trade_count BIGINT DEFAULT 1,
    p_vwap DECIMAL(20,8) DEFAULT NULL,
    p_ws_sequence BIGINT DEFAULT NULL,
    p_is_closed BOOLEAN DEFAULT true
)
RETURNS void AS $$
DECLARE
    timeframe_seconds BIGINT;
    result_record RECORD;
BEGIN
    -- Use the batch function for consistency
    SELECT * INTO result_record FROM insert_ws_candles_batch(
        ARRAY[jsonb_build_object(
            'market_id', p_market_id,
            'timeframe', p_timeframe,
            'timestamp_start', p_timestamp_start,
            'open_price', p_open_price,
            'high_price', p_high_price,
            'low_price', p_low_price,
            'close_price', p_close_price,
            'volume', p_volume,
            'trade_count', p_trade_count,
            'vwap', p_vwap,
            'ws_sequence', p_ws_sequence,
            'is_closed', p_is_closed
        )]
    );

    IF result_record.error_count > 0 THEN
        RAISE EXCEPTION 'Failed to insert candle data';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Monitoring and maintenance functions
CREATE OR REPLACE FUNCTION ws_candles_health_check()
RETURNS TABLE(
    metric_name TEXT,
    metric_value TEXT,
    status TEXT
) AS $$
BEGIN
    -- Partition health
    RETURN QUERY
    SELECT 'partition_count'::TEXT,
           COUNT(*)::TEXT,
           CASE WHEN COUNT(*) > 0 THEN 'OK' ELSE 'WARNING' END
    FROM information_schema.tables
    WHERE table_name LIKE 'ws_candles_%';

    -- Recent data check
    RETURN QUERY
    SELECT 'latest_data_age_minutes'::TEXT,
           EXTRACT(EPOCH FROM (NOW() - to_timestamp(MAX(timestamp_start))))::INTEGER / 60::TEXT,
           CASE WHEN MAX(timestamp_start) > EXTRACT(EPOCH FROM NOW() - INTERVAL '5 minutes')::BIGINT
                THEN 'OK' ELSE 'WARNING' END
    FROM ws_candles;

    -- Index usage check
    RETURN QUERY
    SELECT 'unique_index_usage'::TEXT,
           COALESCE(idx_tup_read::TEXT, '0'),
           CASE WHEN COALESCE(idx_tup_read, 0) > 0 THEN 'OK' ELSE 'INFO' END
    FROM pg_stat_user_indexes
    WHERE indexrelname = 'idx_ws_candles_unique';
END;
$$ LANGUAGE plpgsql;

-- Function to create new monthly partition
CREATE OR REPLACE FUNCTION create_monthly_partition(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT AS $$
DECLARE
    start_ts BIGINT;
    end_ts BIGINT;
    partition_name TEXT;
BEGIN
    start_ts := EXTRACT(EPOCH FROM date_trunc('month', target_date))::BIGINT;
    end_ts := EXTRACT(EPOCH FROM date_trunc('month', target_date + INTERVAL '1 month'))::BIGINT;
    partition_name := 'ws_candles_' || to_char(target_date, 'YYYY_MM');

    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF ws_candles FOR VALUES FROM (%L) TO (%L)',
                  partition_name, start_ts, end_ts);

    RETURN 'Created partition: ' || partition_name;
END;
$$ LANGUAGE plpgsql;

-- Enhanced comments with optimization notes
COMMENT ON TABLE ws_candles IS 'High-performance partitioned WebSocket candles storage with time-series optimization';
COMMENT ON COLUMN ws_candles.timestamp_start IS 'Unix timestamp (partitioning key) from WebSocket feed';
COMMENT ON COLUMN ws_candles.timestamp_end IS 'Calculated end timestamp based on timeframe duration';
COMMENT ON COLUMN ws_candles.ws_sequence IS 'WebSocket sequence number for message ordering and gap detection';
COMMENT ON COLUMN ws_candles.is_closed IS 'Candle completion status - false for live/updating candles';

COMMENT ON FUNCTION insert_ws_candles_batch IS 'High-throughput batch insertion with smart conflict resolution';
COMMENT ON FUNCTION insert_ws_candle IS 'Legacy single-candle insert (uses batch function internally)';
COMMENT ON FUNCTION refresh_ws_token_stats IS 'Manual refresh of materialized view statistics';
COMMENT ON FUNCTION ws_candles_health_check IS 'System health monitoring for partitions and data freshness';

COMMENT ON VIEW ws_candles_readable IS 'Human-readable view with timestamp conversion and token symbols';
COMMENT ON MATERIALIZED VIEW ws_token_stats IS 'Pre-aggregated 30-day statistics with volatility metrics';

COMMENT ON INDEX idx_ws_candles_unique IS 'Primary unique constraint for deduplication';
COMMENT ON INDEX idx_ws_candles_market_tf IS 'Covering index for market-timeframe queries';
COMMENT ON INDEX idx_ws_candles_recent_prices IS 'Hot data index for recent price queries';
COMMENT ON INDEX idx_ws_candles_volume_leaders IS 'High-volume candle identification';

-- Performance monitoring view
CREATE VIEW ws_performance_metrics AS
SELECT
    'candles_per_second' as metric,
    COUNT(*)::FLOAT / EXTRACT(EPOCH FROM (MAX(to_timestamp(timestamp_start)) - MIN(to_timestamp(timestamp_start)))) as value
FROM ws_candles
WHERE timestamp_start >= EXTRACT(EPOCH FROM NOW() - INTERVAL '1 hour')::BIGINT
UNION ALL
SELECT
    'partition_efficiency' as metric,
    AVG(pg_relation_size(schemaname||'.'||tablename)) / 1024.0 / 1024.0 as value
FROM pg_tables
WHERE tablename LIKE 'ws_candles_%';
