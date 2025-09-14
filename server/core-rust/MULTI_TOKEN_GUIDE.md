# Multi-Token Candles Database Guide

Hệ thống database candles đã được mở rộng để hỗ trợ 4 tokens chính: **BTC**, **ETH**, **SOL**, và **APTOS**.

## 🪙 Supported Tokens

| Token | Symbol | Market ID | Full Name | Decimals |
|-------|--------|-----------|-----------|----------|
| BTC   | BTC    | 15        | Bitcoin   | 8        |
| ETH   | ETH    | 16        | Ethereum  | 18       |
| SOL   | SOL    | 31        | Solana    | 9        |
| APTOS | APT    | 14        | Aptos     | 8        |

## 🏗️ Database Schema

### Main Table: `candles`
```sql
CREATE TABLE candles (
    id BIGSERIAL PRIMARY KEY,
    market_id VARCHAR(50) NOT NULL,  -- Token market ID (15, 16, 31, 14)
    timeframe VARCHAR(10) NOT NULL,  -- 1m, 5m, 1h, 1d, etc.
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
    quality_score DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    gap_detected BOOLEAN NOT NULL DEFAULT false,
    volatility_z_score DECIMAL(10,6),
    data_source VARCHAR(50) NOT NULL DEFAULT 'websocket_tick',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Views & Materialized Views

#### `candles_with_tokens` View
```sql
SELECT 
    c.*,
    get_token_symbol(c.market_id) as token_symbol,
    -- Token full name mapping
FROM candles c;
```

#### `market_summaries` Materialized View
Pre-computed statistics for faster analytics:
- Candle count per token/timeframe
- Volume averages and maximums
- Quality scores
- Gap detection statistics
- Price ranges

## 🚀 Usage Examples

### 1. Basic Token Operations

```rust
use data::candles::{database::CandleDatabase, types::*};

// Get all supported tokens
let tokens = Token::all_tokens(); // [BTC, ETH, SOL, APTOS]

// Convert between market ID and token
let btc = Token::from_market_id("15").unwrap(); // Token::BTC
let market_id = Token::BTC.market_id(); // "15"
let symbol = Token::BTC.symbol(); // "BTC"
```

### 2. Loading Token-Specific Data

```rust
// Load candles for a specific token
let btc_candles = candle_db
    .load_token_candles(&Token::BTC, TimeFrame::M1, None, None, Some(100))
    .await?;

// Load latest candles for a token
let latest_eth = candle_db
    .load_latest_token_candles(&Token::ETH, TimeFrame::H1, 24)
    .await?;
```

### 3. Multi-Token Operations

```rust
// Load data for all tokens simultaneously
let all_candles = candle_db
    .load_all_tokens_candles(TimeFrame::M5, start_time, end_time, None)
    .await?;

for (token, candles) in all_candles {
    println!("{}: {} candles", token.symbol(), candles.len());
}

// Get market summaries for all tokens
let summaries = candle_db
    .get_tokens_market_summary(TimeFrame::H1)
    .await?;
```

### 4. Market Pair Configuration

```rust
// Create market pairs
let btc_usdt = MarketPair::new(Token::BTC, "USDT");
assert_eq!(btc_usdt.symbol(), "BTC-USDT");

// Get default pairs (all tokens paired with USDT)
let default_pairs = MarketPair::default_pairs();
// Returns: BTC-USDT, ETH-USDT, SOL-USDT, APT-USDT
```

### 5. Cleanup Operations

```rust
// Cleanup old data for a specific token
let deleted = candle_db
    .cleanup_token_candles(&Token::SOL, TimeFrame::M1, cutoff_time)
    .await?;

// Cleanup for all tokens
let cleanup_results = candle_db
    .cleanup_all_tokens_candles(TimeFrame::M1, cutoff_time)
    .await?;
```

## 📊 Analytics & Statistics

### Database Statistics
```rust
let stats = candle_db.get_database_stats().await?;
println!("Total candles: {}", stats.total_candles);
println!("Unique markets: {}", stats.unique_markets);
println!("Table size: {}", stats.table_size);
```

### Market Summaries
```rust
let summary = candle_db
    .get_market_summary(Token::BTC.market_id(), TimeFrame::H1)
    .await?;

println!("BTC H1 candles: {}", summary.candle_count);
println!("Average volume: {:.2}", summary.avg_volume.unwrap_or(0.0));
println!("Data quality: {:.3}", summary.avg_quality.unwrap_or(0.0));
```

## 🔧 Database Optimizations

### Indexes
- `idx_candles_market_timeframe`: Fast token + timeframe queries
- `idx_candles_token_timeframe_time`: Optimized time-series queries
- `idx_candles_volume_desc`: High-volume candle queries
- `idx_candles_recent_data`: Recent data (last 30 days)
- `idx_candles_quality_analysis`: Data quality analysis

### Constraints
- Positive volume validation
- Valid price relationships (high ≥ open/close, low ≤ open/close)
- Time ordering (end_time ≥ start_time)
- Quality score range (0.0 to 1.0)

### Materialized Views
- `market_summaries`: Pre-computed statistics
- Refresh with: `SELECT refresh_market_summaries();`

## 🧪 Testing

Run the example:
```bash
cd core-rust
cargo run --example multi_token_usage
```

Run tests:
```bash
cargo test multi_token
```

## 🗄️ Migrations

Apply migrations:
```bash
# Initial candles table
psql -d trading_db -f migrations/001_create_candles_table.sql

# Multi-token optimizations
psql -d trading_db -f migrations/002_optimize_multi_token_queries.sql
```

## 📈 Performance Tips

1. **Use token-specific methods** for better performance:
   ```rust
   // Good
   candle_db.load_token_candles(&Token::BTC, ...)
   
   // Less optimal
   candle_db.load_candles("15", ...)
   ```

2. **Leverage materialized views** for analytics:
   ```sql
   SELECT * FROM market_summaries 
   WHERE token_symbol = 'BTC' AND timeframe = '1h';
   ```

3. **Use recent data indexes** for live trading:
   ```rust
   // Queries on recent data are optimized
   let recent = Utc::now() - Duration::days(7);
   candle_db.load_token_candles(&token, tf, Some(recent), None, None)
   ```

4. **Batch operations** for bulk data:
   ```rust
   // Batch saves are transactional and faster
   candle_db.save_candles_batch(&candles).await?;
   ```

## 🔄 Integration with Existing Code

The multi-token system is backward compatible. Existing code using market IDs will continue to work:

```rust
// Old way (still works)
candle_db.load_candles("15", TimeFrame::M1, None, None, None).await?;

// New way (recommended)
candle_db.load_token_candles(&Token::BTC, TimeFrame::M1, None, None, None).await?;
```

## 🚨 Error Handling

New error types for token operations:
```rust
match result {
    Err(CandleError::UnknownToken(symbol)) => {
        println!("Unknown token: {}", symbol);
    }
    Err(CandleError::InvalidMarketPair(pair)) => {
        println!("Invalid pair: {}", pair);
    }
    // ... other errors
}
```
