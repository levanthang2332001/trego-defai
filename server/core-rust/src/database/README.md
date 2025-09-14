# Database - Multi-Token Candles System

Hệ thống database PostgreSQL cho việc lưu trữ và quản lý dữ liệu nến (candles) của 4 tokens: **BTC**, **ETH**, **SOL**, và **APTOS**.

## 📁 Cấu Trúc Thư Mục

```
database/
├── README.md              # Tài liệu chính
├── migrations/            # Database schema migrations
│   ├── 001_create_candles_table.sql
│   └── 002_optimize_multi_token_queries.sql
├── scripts/               # Scripts tiện ích
│   ├── test_database.sh   # Test database connection
│   ├── setup_database.sh  # Khởi tạo database
│   └── backup_database.sh # Backup database
└── docs/                  # Tài liệu chi tiết
    ├── schema.md          # Database schema
    ├── performance.md     # Performance tuning
    └── troubleshooting.md # Xử lý sự cố
```

## 🚀 Khởi Tạo Database

### 1. Cài Đặt PostgreSQL

```bash
# Ubuntu/Debian
sudo apt-get install postgresql postgresql-contrib

# macOS
brew install postgresql

# Windows
# Download từ https://www.postgresql.org/download/windows/
```

### 2. Tạo Database

```bash
# Đăng nhập PostgreSQL
sudo -u postgres psql

# Tạo database và user
CREATE DATABASE trading_db;
CREATE USER trading_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE trading_db TO trading_user;
\q
```

### 3. Cấu Hình Environment

```bash
# Tạo file .env hoặc export
export DATABASE_URL="postgresql://trading_user:your_secure_password@localhost:5432/trading_db"
```

### 4. Chạy Migrations

```bash
# Từ thư mục core-rust/
sqlx migrate run --source ./database/migrations
```

## 🪙 Tokens Được Hỗ Trợ

| Token | Symbol | Market ID | Full Name | Decimals | Trading Pair |
|-------|--------|-----------|-----------|----------|--------------|
| BTC   | BTC    | 15        | Bitcoin   | 8        | BTC-USDT     |
| ETH   | ETH    | 16        | Ethereum  | 18       | ETH-USDT     |
| SOL   | SOL    | 31        | Solana    | 9        | SOL-USDT     |
| APTOS | APT    | 14        | Aptos     | 8        | APT-USDT     |

## ⏰ TimeFrames Hỗ Trợ

- **Seconds**: 1s, 5s, 15s, 30s
- **Minutes**: 1m, 3m, 5m, 15m, 30m
- **Hours**: 1h, 2h, 4h, 6h, 12h
- **Days**: 1d
- **Weeks**: 1w
- **Months**: 1M

## 🏗️ Database Schema

### Bảng `candles`

```sql
CREATE TABLE candles (
    id BIGSERIAL PRIMARY KEY,
    market_id VARCHAR(50) NOT NULL,      -- Token market ID (15, 16, 31, 14)
    timeframe VARCHAR(10) NOT NULL,      -- Timeframe (1m, 5m, 1h, etc.)
    start_time TIMESTAMPTZ NOT NULL,     -- Candle start time
    end_time TIMESTAMPTZ NOT NULL,       -- Candle end time
    open_price DECIMAL(20,8) NOT NULL,   -- Opening price
    high_price DECIMAL(20,8) NOT NULL,   -- Highest price
    low_price DECIMAL(20,8) NOT NULL,    -- Lowest price
    close_price DECIMAL(20,8) NOT NULL,  -- Closing price
    volume DECIMAL(20,8) NOT NULL DEFAULT 0,        -- Trading volume
    tick_count BIGINT NOT NULL DEFAULT 0,           -- Number of ticks
    vwap DECIMAL(20,8) NOT NULL DEFAULT 0,          -- Volume weighted average price
    spread_avg DECIMAL(20,8) NOT NULL DEFAULT 0,    -- Average bid-ask spread
    spread_min DECIMAL(20,8) NOT NULL DEFAULT 0,    -- Minimum spread
    spread_max DECIMAL(20,8) NOT NULL DEFAULT 0,    -- Maximum spread
    is_closed BOOLEAN NOT NULL DEFAULT true,        -- Candle completion status
    quality_score DECIMAL(3,2) NOT NULL DEFAULT 1.0, -- Data quality (0.0-1.0)
    gap_detected BOOLEAN NOT NULL DEFAULT false,    -- Price gap detection
    volatility_z_score DECIMAL(10,6),              -- Volatility anomaly score
    data_source VARCHAR(50) NOT NULL DEFAULT 'websocket_tick', -- Data source
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),  -- Record creation time
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()   -- Last update time
);
```

### Views & Materialized Views

#### `candles_with_tokens` View
```sql
CREATE VIEW candles_with_tokens AS
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

#### `market_summaries` Materialized View
Pre-computed statistics for faster analytics queries.

## 🔍 Scripts Tiện Ích

### Test Database Connection
```bash
cd database/scripts
./test_database.sh
```

### Setup Database (Coming Soon)
```bash
cd database/scripts
./setup_database.sh
```

### Backup Database (Coming Soon)
```bash
cd database/scripts
./backup_database.sh
```

## 📊 Performance Optimizations

### Indexes
- `idx_candles_market_timeframe`: Fast token + timeframe queries
- `idx_candles_token_timeframe_time`: Time-series queries with ordering
- `idx_candles_volume_desc`: High-volume candle queries
- `idx_candles_recent_data`: Recent data (last 30 days) optimization
- `idx_candles_quality_analysis`: Data quality analysis queries

### Constraints
- Positive volume validation
- Valid price relationships (high ≥ open/close, low ≤ open/close)
- Time ordering (end_time ≥ start_time)
- Quality score range (0.0 to 1.0)

## 🚨 Troubleshooting

### Common Issues

1. **Connection Failed**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Start PostgreSQL
   sudo systemctl start postgresql
   ```

2. **Table Not Found**
   ```bash
   # Run migrations
   sqlx migrate run --source ./database/migrations
   ```

3. **Permission Denied**
   ```bash
   # Grant permissions
   sudo -u postgres psql
   GRANT ALL PRIVILEGES ON DATABASE trading_db TO trading_user;
   ```

## 📈 Usage Examples

### Rust Code

```rust
use data::candles::{database::CandleDatabase, types::*};

// Load BTC candles
let btc_candles = candle_db
    .load_token_candles(&Token::BTC, TimeFrame::H1, None, None, Some(100))
    .await?;

// Load all tokens
let all_candles = candle_db
    .load_all_tokens_candles(TimeFrame::M5, start_time, end_time, None)
    .await?;

// Get market summaries
let summaries = candle_db
    .get_tokens_market_summary(TimeFrame::H1)
    .await?;
```

### SQL Queries

```sql
-- Get latest BTC candles
SELECT * FROM candles 
WHERE market_id = '15' AND timeframe = '1h'
ORDER BY start_time DESC 
LIMIT 24;

-- Get volume leaders
SELECT market_id, get_token_symbol(market_id) as token, 
       AVG(volume) as avg_volume
FROM candles 
WHERE timeframe = '1h' AND start_time >= NOW() - INTERVAL '24 hours'
GROUP BY market_id, token
ORDER BY avg_volume DESC;

-- Market summaries
SELECT * FROM market_summaries 
WHERE timeframe = '1h'
ORDER BY token_symbol;
```

## 📝 Maintenance

### Regular Tasks

1. **Refresh Materialized Views**
   ```sql
   SELECT refresh_market_summaries();
   ```

2. **Cleanup Old Data**
   ```rust
   // Rust code
   let cutoff = Utc::now() - Duration::days(30);
   candle_db.cleanup_all_tokens_candles(TimeFrame::M1, cutoff).await?;
   ```

3. **Database Statistics**
   ```sql
   SELECT * FROM pg_stat_user_tables WHERE relname = 'candles';
   ```

## 🔗 Links

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [SQLx Documentation](https://docs.rs/sqlx/)
- [Multi-Token Guide](../MULTI_TOKEN_GUIDE.md)
