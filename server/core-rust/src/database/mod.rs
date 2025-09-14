//! Database module for multi-token candles system
//! 
//! This module provides database connectivity, management, and utilities
//! for storing and retrieving candle data for BTC, ETH, SOL, and APTOS tokens.

pub mod connection;

pub use connection::{
    DatabaseManager, 
    DatabaseHealthStatus, 
    DatabaseConfig,
    mask_password
};

// Re-export commonly used types from data crate
pub use data::candles::{
    database::CandleDatabase,
    types::{Token, TimeFrame, Candle, CandleMetadata, DataSource, MarketPair, DatabaseStats, MarketSummary}
};

/// Database module constants
pub mod constants {
    /// Supported tokens with their market IDs
    pub const SUPPORTED_TOKENS: &[(&str, &str, &str)] = &[
        ("BTC", "15", "Bitcoin"),
        ("ETH", "16", "Ethereum"),
        ("SOL", "31", "Solana"),
        ("APTOS", "14", "Aptos"),
    ];
    
    /// Default database connection settings
    pub const DEFAULT_DATABASE_URL: &str = "postgresql://postgres:password@localhost:5432/trading_db";
    pub const DEFAULT_MAX_CONNECTIONS: u32 = 10;
    pub const DEFAULT_MIN_CONNECTIONS: u32 = 1;
    pub const DEFAULT_CONNECTION_TIMEOUT_SECS: u64 = 30;
    pub const DEFAULT_IDLE_TIMEOUT_SECS: u64 = 600;
    
    /// Migration settings
    pub const MIGRATIONS_DIR: &str = "./database/migrations";
    
    /// Backup settings
    pub const BACKUP_DIR: &str = "./database/backups";
}

/// Utility functions for database operations
pub mod utils {
    use super::*;
    use anyhow::Result;
    
    /// Initialize database with proper configuration
    pub async fn initialize_database() -> Result<DatabaseManager> {
        let config = DatabaseConfig::from_env()?;
        DatabaseManager::new(&config.url).await
    }
    
    /// Check if all required environment variables are set
    pub fn check_environment() -> Vec<String> {
        let mut missing = Vec::new();
        
        if std::env::var("DATABASE_URL").is_err() {
            missing.push("DATABASE_URL".to_string());
        }
        
        missing
    }
    
    /// Get database URL with fallback to default
    pub fn get_database_url() -> String {
        std::env::var("DATABASE_URL")
            .unwrap_or_else(|_| constants::DEFAULT_DATABASE_URL.to_string())
    }
    
    /// Validate database URL format
    pub fn validate_database_url(url: &str) -> Result<()> {
        if !url.starts_with("postgresql://") && !url.starts_with("postgres://") {
            return Err(anyhow::anyhow!("Invalid database URL format"));
        }
        
        // Basic URL validation
        if !url.contains('@') || !url.contains('/') {
            return Err(anyhow::anyhow!("Database URL missing required components"));
        }
        
        Ok(())
    }
    
    /// Extract database name from URL
    pub fn extract_database_name(url: &str) -> Option<String> {
        url.split('/').last()
            .and_then(|part| part.split('?').next())
            .map(|name| name.to_string())
    }
    
    /// Extract host and port from URL
    pub fn extract_host_port(url: &str) -> Option<(String, u16)> {
        let after_at = url.split('@').nth(1)?;
        let host_port = after_at.split('/').next()?;
        
        if let Some(colon_pos) = host_port.rfind(':') {
            let host = host_port[..colon_pos].to_string();
            let port = host_port[colon_pos + 1..].parse().ok()?;
            Some((host, port))
        } else {
            Some((host_port.to_string(), 5432)) // Default PostgreSQL port
        }
    }
}

/// Health check utilities
pub mod health {
    use super::*;
    use anyhow::Result;
    use serde::{Serialize, Deserialize};
    
    /// Comprehensive database health report
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct HealthReport {
        pub timestamp: chrono::DateTime<chrono::Utc>,
        pub overall_status: String,
        pub database_status: DatabaseHealthStatus,
        pub token_status: TokenHealthStatus,
        pub performance_metrics: PerformanceMetrics,
    }
    
    /// Token-specific health status
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct TokenHealthStatus {
        pub btc_candles: u64,
        pub eth_candles: u64,
        pub sol_candles: u64,
        pub aptos_candles: u64,
        pub total_candles: u64,
        pub data_freshness_minutes: i64,
    }
    
    /// Performance metrics
    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct PerformanceMetrics {
        pub avg_query_time_ms: f64,
        pub connection_pool_usage: f64,
        pub table_size_mb: f64,
        pub index_hit_ratio: f64,
    }
    
    /// Generate comprehensive health report
    pub async fn generate_health_report(db_manager: &DatabaseManager) -> Result<HealthReport> {
        let timestamp = chrono::Utc::now();
        
        // Get database health status
        let database_status = db_manager.health_check().await?;
        
        // Calculate token status
        let token_status = calculate_token_status(db_manager).await?;
        
        // Get performance metrics
        let performance_metrics = calculate_performance_metrics(db_manager).await?;
        
        // Determine overall status
        let overall_status = if database_status.overall_health == "healthy" 
            && token_status.total_candles > 0 {
            "healthy"
        } else {
            "degraded"
        }.to_string();
        
        Ok(HealthReport {
            timestamp,
            overall_status,
            database_status,
            token_status,
            performance_metrics,
        })
    }
    
    async fn calculate_token_status(db_manager: &DatabaseManager) -> Result<TokenHealthStatus> {
        use data::candles::types::Token;
        
        let mut btc_candles = 0;
        let mut eth_candles = 0;
        let mut sol_candles = 0;
        let mut aptos_candles = 0;
        
        for token in Token::all_tokens() {
            let count = sqlx::query_scalar::<_, i64>(
                "SELECT COUNT(*) FROM candles WHERE market_id = $1"
            )
            .bind(token.market_id())
            .fetch_one(db_manager.pool())
            .await?;
            
            match token {
                Token::BTC => btc_candles = count as u64,
                Token::ETH => eth_candles = count as u64,
                Token::SOL => sol_candles = count as u64,
                Token::APTOS => aptos_candles = count as u64,
            }
        }
        
        let total_candles = btc_candles + eth_candles + sol_candles + aptos_candles;
        
        // Calculate data freshness (minutes since last candle)
        let data_freshness_minutes = sqlx::query_scalar::<_, Option<i64>>(
            "SELECT EXTRACT(EPOCH FROM (NOW() - MAX(created_at))) / 60 FROM candles"
        )
        .fetch_one(db_manager.pool())
        .await?
        .unwrap_or(0);
        
        Ok(TokenHealthStatus {
            btc_candles,
            eth_candles,
            sol_candles,
            aptos_candles,
            total_candles,
            data_freshness_minutes,
        })
    }
    
    async fn calculate_performance_metrics(db_manager: &DatabaseManager) -> Result<PerformanceMetrics> {
        // Get table size in MB
        let table_size_mb = sqlx::query_scalar::<_, Option<f64>>(
            "SELECT pg_total_relation_size('candles') / (1024.0 * 1024.0)"
        )
        .fetch_one(db_manager.pool())
        .await?
        .unwrap_or(0.0);
        
        // Get index hit ratio
        let index_hit_ratio = sqlx::query_scalar::<_, Option<f64>>(
            "SELECT 
                CASE 
                    WHEN (idx_blks_hit + idx_blks_read) > 0 
                    THEN idx_blks_hit::float / (idx_blks_hit + idx_blks_read) * 100
                    ELSE 0 
                END
             FROM pg_statio_user_tables WHERE relname = 'candles'"
        )
        .fetch_one(db_manager.pool())
        .await?
        .unwrap_or(0.0);
        
        Ok(PerformanceMetrics {
            avg_query_time_ms: 0.0, // Would need query logging to calculate
            connection_pool_usage: 0.0, // Would need pool metrics
            table_size_mb,
            index_hit_ratio,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_database_name() {
        let url = "postgresql://user:pass@localhost:5432/trading_db";
        assert_eq!(utils::extract_database_name(url), Some("trading_db".to_string()));
        
        let url_with_params = "postgresql://user:pass@localhost:5432/trading_db?sslmode=require";
        assert_eq!(utils::extract_database_name(url_with_params), Some("trading_db".to_string()));
    }

    #[test]
    fn test_extract_host_port() {
        let url = "postgresql://user:pass@localhost:5432/trading_db";
        assert_eq!(utils::extract_host_port(url), Some(("localhost".to_string(), 5432)));
        
        let url_no_port = "postgresql://user:pass@localhost/trading_db";
        assert_eq!(utils::extract_host_port(url_no_port), Some(("localhost".to_string(), 5432)));
    }

    #[test]
    fn test_validate_database_url() {
        assert!(utils::validate_database_url("postgresql://user:pass@localhost:5432/db").is_ok());
        assert!(utils::validate_database_url("postgres://user:pass@localhost:5432/db").is_ok());
        assert!(utils::validate_database_url("mysql://user:pass@localhost:3306/db").is_err());
        assert!(utils::validate_database_url("invalid_url").is_err());
    }

    #[test]
    fn test_supported_tokens() {
        assert_eq!(constants::SUPPORTED_TOKENS.len(), 4);
        
        let btc_token = constants::SUPPORTED_TOKENS.iter()
            .find(|(symbol, _, _)| *symbol == "BTC")
            .unwrap();
        assert_eq!(btc_token.1, "15"); // Market ID
        assert_eq!(btc_token.2, "Bitcoin"); // Full name
    }
}
