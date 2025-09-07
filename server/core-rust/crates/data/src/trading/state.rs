use std::collections::{HashMap, HashSet};
use std::sync::Arc;
use tokio::sync::RwLock;
use types::TradingParams;

#[derive(Debug)]
pub struct TradingState {
  market_params: Arc<RwLock<HashMap<i64, TradingParams>>>,
  active_markets: Arc<RwLock<HashSet<i64>>>,
}

impl TradingState {
  pub fn new() -> Self {
    Self {
      market_params: Arc::new(RwLock::new(HashMap::new())),
      active_markets: Arc::new(RwLock::new(HashSet::new())),
    }
  }

  pub async fn update_params(&self, market_id: i64, params: TradingParams) -> Result<(), String> {
    let mut market_params = self.market_params.write().await;
    market_params.insert(market_id, params);

    // Add to active markets
    let mut active = self.active_markets.write().await;
    active.insert(market_id);

    Ok(())
  }

  pub async fn get_params(&self, market_id: i64) -> Option<TradingParams> {
    let market_params = self.market_params.read().await;
    market_params.get(&market_id).cloned()
  }

  pub async fn is_market_active(&self, market_id: i64) -> bool {
    let active = self.active_markets.read().await;
    active.contains(&market_id)
  }
}
