export type SwapParams = {
  fromToken: string;
  toToken: string;
  amount: number;
};

export type LiquidityParams = {
  tokenA: string;
  tokenB: string;
  amountA: number;
  amountB: number;
};

export type StakingParams = {
  token: string;
  amount: number;
  duration?: number;
};

export type UnStakingParams = {
  token: string;
  amount: number;
};

export type BorrowParams = {
  token: string;
  amount: number;
  collateralToken?: string;
  collateralAmount?: number;
  ltv?: number; // Loan-to-Value ratio
};

export type SupplyParams = {
  token: string;
  amount: number;
  duration?: number;
  interestRate?: number;
};

export type RepayParams = {
  token: string;
  amount: number | 'max';
  repayFrom?: 'wallet' | 'deposited collateral';
};

export type WithdrawParams = {
  token: string;
  amount: number | 'max';
};

export type ClaimRewardParams = {
  token?: string;
  platform?: string;
};

export type PlaceLimitOrderParams = {
  token: string;
  amount: number;
  price: number;
  side: 'buy' | 'sell';
};

export type PlaceMarketOrderParams = {
  token: string;
  amount: number;
  side: 'buy' | 'sell';
};

export type RemoveLiquidityParams = {
  tokenA: string;
  tokenB: string;
  liquidityAmount: number;
  minAmountA?: number;
  minAmountB?: number;
};

export type HelpParams = {
  topic: string;
  request: string;
};

export type ParamsType =
  | SwapParams
  | LiquidityParams
  | StakingParams
  | UnStakingParams
  | BorrowParams
  | SupplyParams
  | RepayParams
  | WithdrawParams
  | ClaimRewardParams
  | PlaceLimitOrderParams
  | PlaceMarketOrderParams
  | RemoveLiquidityParams
  | BridgeParams
  | HelpParams;

export enum ActionType {
  BRIDGE = 'bridge',
  SWAP = 'swap',
  PRE_SWAP = 'pre_swap',
  LIQUIDITY = 'liquidity',
  STAKING = 'staking',
  UNSTAKING = 'unstaking',
  BORROW = 'borrow',
  SUPPLY = 'supply',
  REPAY = 'repay',
  WITHDRAW = 'withdraw',
  CLAIM_REWARD = 'claim_reward',
  PLACE_LIMIT_ORDER = 'place_limit_order',
  PLACE_MARKET_ORDER = 'place_market_order',
  REMOVE_LIQUIDITY = 'remove_liquidity',
  HELP = 'help',
  UNKNOWN = 'unknown',
}

export interface DeFiIntent {
  actionType: ActionType;
  params: ParamsType;
  confidence: number;
  missingFields: string[];
  context: string;
}
export interface BridgeParams {
  tokenA: string;
  tokenB: string;
  srcChainKey: string;
  dstChainKey: string;
  amount: string;
  dstAddress: string;
  user_address: string;
}
export interface BridgeStargateParams {
  srcToken: string;
  dstToken: string;
  srcAddress: string;
  dstAddress: string;
  srcChainKey: string;
  dstChainKey: string;
  srcAmount: string;
  dstAmountMin: string;
}
