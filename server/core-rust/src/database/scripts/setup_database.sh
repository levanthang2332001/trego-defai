#!/bin/bash

# Simple Database Setup Script
echo "Database Setup"
echo "=============="

# Load environment variables
if [ -f ".env" ]; then
    source .env
    echo "Loaded .env"
else
    echo "Error: .env file not found"
    exit 1
fi

# Extract database info
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')

echo "Database: $DB_NAME"
echo "Host: $DB_HOST:$DB_PORT"
echo "User: $DB_USER"

# Run migrations directly
echo ""
echo "Running migrations..."
MIGRATIONS_DIR="src/database/migrations"

if [ -d "$MIGRATIONS_DIR" ]; then
    for migration in $MIGRATIONS_DIR/*.sql; do
        if [ -f "$migration" ]; then
            echo "Running $(basename "$migration")..."
            if PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$migration"; then
                echo "Success: $(basename "$migration")"
            else
                echo "Failed: $(basename "$migration")"
                exit 1
            fi
        fi
    done
else
    echo "Error: Migrations directory not found"
    exit 1
fi

# Simple verification
echo ""
echo "Verifying..."
if PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" &>/dev/null; then
    echo "Connection OK"

    # Check ws_candles table
    TABLE_EXISTS=$(PGPASSWORD="$DB_PASSWORD" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ws_candles');" | tr -d ' ')

    if [ "$TABLE_EXISTS" = "t" ]; then
        echo "ws_candles table exists"
    else
        echo "ws_candles table not found"
        exit 1
    fi
else
    echo "Connection failed"
    exit 1
fi

echo ""
echo "Setup completed!"
echo "Ready to use ws_candles table"
