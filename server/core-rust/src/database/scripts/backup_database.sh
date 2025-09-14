#!/bin/bash

# Database Backup Script for Multi-Token Candles System
# Supports: BTC, ETH, SOL, APTOS

set -e  # Exit on any error

# Configuration
DB_NAME="trading_db"
DB_USER="trading_user"
BACKUP_DIR="$(dirname "$0")/../backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/trading_db_backup_$DATE.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Create backup directory
create_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        mkdir -p "$BACKUP_DIR"
        print_success "Created backup directory: $BACKUP_DIR"
    fi
}

# Check database connection
check_connection() {
    echo "🔌 Checking database connection..."

    if [ -z "$DATABASE_URL" ]; then
        print_error "DATABASE_URL environment variable not set"
        print_info "Please set DATABASE_URL or run: source .env"
        exit 1
    fi

    # Extract connection details
    DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME_FROM_URL=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
    DB_USER_FROM_URL=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

    # Use URL values if available
    if [ -n "$DB_NAME_FROM_URL" ]; then
        DB_NAME="$DB_NAME_FROM_URL"
    fi
    if [ -n "$DB_USER_FROM_URL" ]; then
        DB_USER="$DB_USER_FROM_URL"
    fi

    print_info "Database: $DB_NAME"
    print_info "User: $DB_USER"
    print_info "Host: $DB_HOST:$DB_PORT"

    # Test connection
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1;" &>/dev/null || {
        print_error "Cannot connect to database"
        exit 1
    }

    print_success "Database connection verified"
}

# Get database statistics before backup
get_database_stats() {
    echo ""
    echo "📊 Database Statistics:"

    # Get table sizes
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public' AND tablename = 'candles'
ORDER BY tablename, attname;

SELECT
    'Total candles' as metric,
    COUNT(*) as value
FROM candles
UNION ALL
SELECT
    'Unique markets' as metric,
    COUNT(DISTINCT market_id) as value
FROM candles
UNION ALL
SELECT
    'Unique timeframes' as metric,
    COUNT(DISTINCT timeframe) as value
FROM candles
UNION ALL
SELECT
    'Date range (days)' as metric,
    EXTRACT(days FROM (MAX(start_time) - MIN(start_time))) as value
FROM candles;
EOF

    # Token breakdown
    echo ""
    print_info "📊 Token Breakdown:"
    PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
SELECT
    market_id,
    CASE market_id
        WHEN '15' THEN 'BTC'
        WHEN '16' THEN 'ETH'
        WHEN '31' THEN 'SOL'
        WHEN '14' THEN 'APTOS'
        ELSE 'Unknown'
    END as token,
    COUNT(*) as candle_count,
    MIN(start_time) as first_candle,
    MAX(start_time) as last_candle
FROM candles
GROUP BY market_id
ORDER BY market_id;
EOF
}

# Create full backup
create_full_backup() {
    echo ""
    echo "💾 Creating full database backup..."

    print_info "Backup file: $BACKUP_FILE"

    # Create backup with pg_dump
    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --verbose \
        --clean \
        --no-owner \
        --no-privileges \
        --format=plain \
        > "$BACKUP_FILE" || {
        print_error "Backup failed"
        exit 1
    }

    # Compress backup
    print_info "Compressing backup..."
    gzip "$BACKUP_FILE" || {
        print_warning "Compression failed, keeping uncompressed backup"
    }

    if [ -f "$BACKUP_FILE.gz" ]; then
        BACKUP_FILE="$BACKUP_FILE.gz"
        print_success "Compressed backup created"
    fi

    # Get backup size
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_success "Backup completed: $BACKUP_FILE ($BACKUP_SIZE)"
}

# Create schema-only backup
create_schema_backup() {
    echo ""
    echo "🏗️  Creating schema-only backup..."

    SCHEMA_FILE="$BACKUP_DIR/trading_db_schema_$DATE.sql"

    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --schema-only \
        --clean \
        --no-owner \
        --no-privileges \
        > "$SCHEMA_FILE" || {
        print_error "Schema backup failed"
        return 1
    }

    print_success "Schema backup created: $SCHEMA_FILE"
}

# Create data-only backup for specific tokens
create_token_backup() {
    local token_id=$1
    local token_name=$2

    echo ""
    echo "🪙 Creating backup for $token_name (Market ID: $token_id)..."

    TOKEN_FILE="$BACKUP_DIR/trading_db_${token_name,,}_$DATE.sql"

    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --data-only \
        --table=candles \
        --where="market_id='$token_id'" \
        > "$TOKEN_FILE" || {
        print_error "Token backup failed for $token_name"
        return 1
    }

    # Get record count
    RECORD_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM candles WHERE market_id='$token_id';" | tr -d ' ')

    print_success "$token_name backup created: $TOKEN_FILE ($RECORD_COUNT records)"
}

# Create incremental backup (last 7 days)
create_incremental_backup() {
    echo ""
    echo "📅 Creating incremental backup (last 7 days)..."

    INCREMENTAL_FILE="$BACKUP_DIR/trading_db_incremental_$DATE.sql"

    PGPASSWORD="$DB_PASSWORD" pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --data-only \
        --table=candles \
        --where="created_at >= NOW() - INTERVAL '7 days'" \
        > "$INCREMENTAL_FILE" || {
        print_error "Incremental backup failed"
        return 1
    }

    # Get record count
    RECENT_COUNT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM candles WHERE created_at >= NOW() - INTERVAL '7 days';" | tr -d ' ')

    print_success "Incremental backup created: $INCREMENTAL_FILE ($RECENT_COUNT records)"
}

# Cleanup old backups
cleanup_old_backups() {
    echo ""
    echo "🧹 Cleaning up old backups..."

    # Keep last 10 backups
    OLD_BACKUPS=$(find "$BACKUP_DIR" -name "trading_db_backup_*.sql*" -type f | sort -r | tail -n +11)

    if [ -n "$OLD_BACKUPS" ]; then
        echo "$OLD_BACKUPS" | while read -r backup; do
            rm "$backup"
            print_info "Removed old backup: $(basename "$backup")"
        done
        print_success "Old backups cleaned up"
    else
        print_info "No old backups to clean up"
    fi
}

# Verify backup integrity
verify_backup() {
    echo ""
    echo "🔍 Verifying backup integrity..."

    if [ -f "$BACKUP_FILE" ]; then
        if [[ "$BACKUP_FILE" == *.gz ]]; then
            # Test gzip file
            if gzip -t "$BACKUP_FILE" 2>/dev/null; then
                print_success "Compressed backup integrity verified"
            else
                print_error "Compressed backup is corrupted"
                return 1
            fi

            # Check SQL content
            if zcat "$BACKUP_FILE" | head -20 | grep -q "PostgreSQL database dump" 2>/dev/null; then
                print_success "Backup content verified"
            else
                print_error "Backup content verification failed"
                return 1
            fi
        else
            # Check uncompressed SQL file
            if head -20 "$BACKUP_FILE" | grep -q "PostgreSQL database dump" 2>/dev/null; then
                print_success "Backup content verified"
            else
                print_error "Backup content verification failed"
                return 1
            fi
        fi
    else
        print_error "Backup file not found"
        return 1
    fi
}

# Show backup summary
show_summary() {
    echo ""
    echo "📋 Backup Summary"
    echo "================"

    print_info "Date: $(date)"
    print_info "Database: $DB_NAME"
    print_info "Backup Directory: $BACKUP_DIR"

    echo ""
    print_info "Created Files:"
    find "$BACKUP_DIR" -name "*_$DATE.*" -type f | while read -r file; do
        SIZE=$(du -h "$file" | cut -f1)
        print_info "  $(basename "$file") - $SIZE"
    done

    echo ""
    print_info "Total Backups in Directory:"
    BACKUP_COUNT=$(find "$BACKUP_DIR" -name "trading_db_*.sql*" -type f | wc -l)
    TOTAL_SIZE=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "Unknown")
    print_info "  Files: $BACKUP_COUNT"
    print_info "  Total Size: $TOTAL_SIZE"
}

# Main backup process
main() {
    echo "💾 Multi-Token Database Backup"
    echo "=============================="
    echo "🪙 Tokens: BTC, ETH, SOL, APTOS"
    echo ""

    # Check what type of backup to create
    BACKUP_TYPE="${1:-full}"

    case "$BACKUP_TYPE" in
        "full")
            echo "Creating full database backup..."
            ;;
        "schema")
            echo "Creating schema-only backup..."
            ;;
        "tokens")
            echo "Creating individual token backups..."
            ;;
        "incremental")
            echo "Creating incremental backup (last 7 days)..."
            ;;
        *)
            print_error "Invalid backup type: $BACKUP_TYPE"
            print_info "Usage: $0 [full|schema|tokens|incremental]"
            exit 1
            ;;
    esac

    # Setup
    create_backup_dir
    check_connection
    get_database_stats

    # Create backups based on type
    case "$BACKUP_TYPE" in
        "full")
            create_full_backup
            verify_backup
            ;;
        "schema")
            create_schema_backup
            ;;
        "tokens")
            create_token_backup "15" "BTC"
            create_token_backup "16" "ETH"
            create_token_backup "31" "SOL"
            create_token_backup "14" "APTOS"
            ;;
        "incremental")
            create_incremental_backup
            ;;
    esac

    # Cleanup and summary
    cleanup_old_backups
    show_summary

    echo ""
    print_success "Backup process completed successfully!"
    print_info "💡 Backup Tips:"
    print_info "  - Store backups in multiple locations"
    print_info "  - Test restore procedures regularly"
    print_info "  - Consider automated backup scheduling"
    print_info "  - Monitor backup sizes for growth trends"
}

# Show usage if no DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "💾 Multi-Token Database Backup Tool"
    echo ""
    print_error "DATABASE_URL environment variable not set"
    print_info "Please set DATABASE_URL or run: source .env"
    print_info ""
    print_info "Usage: $0 [backup_type]"
    print_info "Backup types:"
    print_info "  full        - Complete database backup (default)"
    print_info "  schema      - Schema-only backup"
    print_info "  tokens      - Individual token backups"
    print_info "  incremental - Last 7 days backup"
    print_info ""
    print_info "Examples:"
    print_info "  $0 full"
    print_info "  $0 tokens"
    print_info "  $0 incremental"
    exit 1
fi

# Run main function
main "$@"
