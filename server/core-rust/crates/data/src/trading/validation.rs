use types::TradingParams;

#[derive(Debug)]
pub struct ValidationError {
  pub field: String,
  pub message: String,
}

pub struct ParamsValidator;

impl ParamsValidator {
  pub fn validate_params(params: &TradingParams) -> Result<(), ValidationError> {
    // Validate risk_per_trade
    if params.risk_per_trade <= 0.0 {
      return Err(ValidationError {
        field: "risk_per_trade".to_string(),
        message: "Must be greater than 0".to_string(),
      });
    }

    // Validate k_factor
    if params.k_factor <= 0.0 {
      return Err(ValidationError {
        field: "k_factor".to_string(),
        message: "Must be greater than 0".to_string(),
      });
    }

    // Validate spreads
    if params.min_spread <= 0.0 {
      return Err(ValidationError {
        field: "min_spread".to_string(),
        message: "Must be greater than 0".to_string(),
      });
    }

    if params.max_spread <= params.min_spread {
      return Err(ValidationError {
        field: "max_spread".to_string(),
        message: "Must be greater than min_spread".to_string(),
      });
    }

    // Validate order_size
    if params.order_size <= 0.0 {
      return Err(ValidationError {
        field: "order_size".to_string(),
        message: "Must be greater than 0".to_string(),
      });
    }

    Ok(())
  }
}
