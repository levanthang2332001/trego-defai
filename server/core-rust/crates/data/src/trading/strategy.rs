use super::state::TradingState;
use std::sync::Arc;
use types::TradingParams;

#[derive(Debug)]
pub struct MarketMaker {
  state: Arc<TradingState>,
}

impl MarketMaker {
  pub fn new(state: Arc<TradingState>) -> Self {
    Self { state }
  }

  pub async fn recalculate_quotes(
    &self,
    market_id: i64,
    params: &TradingParams,
  ) -> Result<(f64, f64), String> {
    // Get current market data
    let mid_price = self.get_mid_price(market_id).await?;
    let position = self.get_position(market_id).await?;

    // Calculate optimal quotes using Avellaneda-Stoikov formula
    let gamma = params.risk_per_trade;
    let k = params.k_factor;

    let spread = params.min_spread.max(k * position.abs());

    let bid = mid_price * (1.0 - spread / 2.0);
    let ask = mid_price * (1.0 + spread / 2.0);

    // Validate against max spread
    if (ask - bid) / mid_price > params.max_spread {
      return Err("Spread exceeds maximum allowed".to_string());
    }

    Ok((bid, ask))
  }

  // Mock methods - will be implemented later
  async fn get_mid_price(&self, _market_id: i64) -> Result<f64, String> {
    Ok(100.0) // Mock value
  }

  async fn get_position(&self, _market_id: i64) -> Result<f64, String> {
    Ok(0.0) // Mock value
  }
}
