export interface PreSwap {
  fromToken: {
    tokenAddress: string;
    faAddress: string;
    name: string;
    symbol: string;
    decimals: number;
  };
  amount: string;
  toToken: {
    tokenAddress: string;
    faAddress: string;
    name: string;
    symbol: string;
    decimals: number;
  };
}

export interface Pool {
  currentTick: number;
  feeRate: string;
  feeTier: number;
  poolId: string;
  senderAddress: string;
  sqrtPrice: string;
  token1: string;
  token2: string;
  token1Info: TokenInfo;
  token2Info: TokenInfo;
}

export interface PoolItem {
  id: string;
  aprUSD: string;
  dailyVolumeUSD: string;
  feesUSD: string;
  tvlUSD: string;
  pool: Pool;
}
export interface TokenInfo {
  assetType: string;
  bridge: string | null;
  coinMarketcapId: string;
  coinType: string;
  coingeckoId: string;
  decimals: number;
  faType: string;
  hyperfluidSymbol: string;
  logoUrl: string;
  name: string;
  symbol: string;
  isBanned: boolean;
  websiteUrl: string | null;
}

export interface Subsidy {
  claimed: Array<{
    amount: string;
    amountUSD: string;
    token: string;
  }>;
  unclaimed: Array<{
    amount: string;
    amountUSD: string;
    token: string;
  }>;
}

export interface Fee {
  claimed: Array<{
    amount: string;
    amountUSD: string;
    token: string;
  }>;
  unclaimed: Array<{
    amount: string;
    amountUSD: string;
    token: string;
  }>;
}

export interface Position {
  id: string;
  poolId: string;
  positionId: string;
  positionType: string;
}

export interface PositionItem {
  id: string;
  poolId: string;
  positionId: string;
  positionType: string;
  position: Position;
}

export interface Tick {
  id: string;
  poolId: string;
  tick: number;
  liquidity: string;
  sqrtPrice: string;
}
