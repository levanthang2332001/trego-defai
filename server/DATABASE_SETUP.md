# Database Setup Guide

## Cách thiết lập DATABASE_URL

### 1. Tạo file .env trong thư mục gốc của project:

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@localhost:5432/trego_defai

# Supabase Configuration (existing)
SUPABASE_URL=your_supabase_url
SUPABASE_ROLE_KEY=your_supabase_role_key

# Redis Configuration (existing)  
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=

# Server Configuration
PORT=5000
NODE_ENV=development
```

### 2. Các ví dụ DATABASE_URL:

**Local PostgreSQL:**
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/trego_defai
```

**Remote PostgreSQL:**
```
DATABASE_URL=postgresql://user:password@db.example.com:5432/production_db
```

**Supabase PostgreSQL:**
```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

### 3. Cài đặt sqlx-cli và chạy migrations:

```bash
# Cài đặt sqlx-cli
cargo install sqlx-cli --no-default-features --features postgres

# Chạy migrations
cd core-rust
sqlx migrate run --source ./migrations
```

### 4. Chạy ứng dụng:

```bash
# Với database
DATABASE_URL=postgresql://postgres:password@localhost:5432/trego_defai cargo run

# Hoặc không có database (in-memory only)
cargo run
```

### 5. Kiểm tra kết nối:

- Nếu có DATABASE_URL: Sẽ khởi tạo với PostgreSQL
- Nếu không có DATABASE_URL: Sẽ chạy chế độ in-memory only

## Cấu trúc Database:

Database sẽ tự động tạo bảng `candles` với schema đã định nghĩa trong `migrations/001_create_candles_table.sql`
