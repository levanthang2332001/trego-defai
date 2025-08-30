use super::types::{Candle, TimeFrame};
use async_trait::async_trait;

#[derive(Debug, Clone)]
pub struct CandleClosedEvent {
  pub candle: Candle,
  pub source_timeframe: Option<TimeFrame>,
}

#[async_trait]
pub trait CandleEventPublisher: Send + Sync + std::fmt::Debug {
  async fn publish(&self, event: &CandleClosedEvent) -> anyhow::Result<()>;
}
