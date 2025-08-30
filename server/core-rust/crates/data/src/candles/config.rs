use std::collections::HashMap;
use super::types::TimeFrame;

#[derive(Debug, Clone)]
pub struct CandleStoreConfig {
    pub buffer_sizes: HashMap<TimeFrame, usize>,
    pub max_tick_buffer_size: usize,
    pub enable_quality_scoring: bool,
    pub enable_gap_detection: bool,
    pub enable_volatility_analysis: bool,
    pub auto_cleanup_interval_secs: u64,
    pub aggregation_enabled: bool,
}

impl Default for CandleStoreConfig {
    fn default() -> Self {
        let mut buffer_sizes = HashMap::new();

        // Conservative buffer sizes for production
        buffer_sizes.insert(TimeFrame::M1, 2880);   // 48 hours
        buffer_sizes.insert(TimeFrame::M3, 1440);   // 72 hours
        buffer_sizes.insert(TimeFrame::M5, 1728);   // 144 hours (6 days)
        buffer_sizes.insert(TimeFrame::M15, 1344);  // 336 hours (14 days)
        buffer_sizes.insert(TimeFrame::M30, 1440);  // 720 hours (30 days)
        buffer_sizes.insert(TimeFrame::H1, 720);    // 720 hours (30 days)
        buffer_sizes.insert(TimeFrame::H4, 360);    // 1440 hours (60 days)
        buffer_sizes.insert(TimeFrame::D1, 365);    // 365 days (1 year)
        buffer_sizes.insert(TimeFrame::W1, 104);    // 104 weeks (2 years)
        buffer_sizes.insert(TimeFrame::MN1, 60);    // 60 months (5 years)

        Self {
            buffer_sizes,
            max_tick_buffer_size: 10000,
            enable_quality_scoring: true,
            enable_gap_detection: true,
            enable_volatility_analysis: true,
            auto_cleanup_interval_secs: 3600, // 1 hour
            aggregation_enabled: true,
        }
    }
}
