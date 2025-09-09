import { initTappSDK, TradeSizeExceedsError } from '@tapp-exchange/sdk';
import { Network } from '@aptos-labs/ts-sdk';

// Types and interfaces
export interface SwapRoute {
  poolId: string;
  tokenA: string;
  tokenB: string;
  fee: number;
}

export interface EstimateSwapParams {
  poolId: string;
  a2b: boolean;
  field: 'input' | 'output';
  amount: number;
  pair: [number, number];
}

export interface SwapResult {
  amountOut: number;
  priceImpact: number;
  minAmountOut: number;
  error?: TradeSizeExceedsError;
}

export interface AMMSwapParams {
  poolId: string;
  a2b: boolean;
  fixedAmountIn: boolean;
  amount0: number;
  amount1: number;
}

export interface PoolInfo {
  apr: [object];
  createdAt: string;
  fee: string;
  feeTier: string;
  poolId: string;
  poolType: string;
  tokens: [object];
  tvl: string;
  txns: string;
  volume: string;
  volumeData: [object];
  volumePercentage24h: string;
  volumePercentage30d: string;
  volumePercentage7d: string;
}

// Initialize SDK with proper configuration
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const sdk = initTappSDK({
  network: Network.MAINNET,
}) as any;

export async function getRoute(
  token0: string,
  token1: string,
): Promise<SwapRoute[]> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const routes = await sdk.Swap.getRoute(token0, token1);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return routes || [];
  } catch (error) {
    console.error('Error getting swap route:', error);
    throw new Error(`Failed to get route for ${token0} -> ${token1}`);
  }
}

export const getEstSwap = async (
  params: EstimateSwapParams,
): Promise<SwapResult> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const result = await sdk.Swap.getEstSwapAmount(params);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (result.error instanceof TradeSizeExceedsError) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.error('Trade size exceeds limit:', result.error.message);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      console.error('Max allowed amount:', result.error.maxAmountIn);
    }

    return {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      amountOut: result.amountOut || 0,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      priceImpact: result.priceImpact || 0,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      minAmountOut: result.minAmountOut || 0,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      error: result.error,
    };
  } catch (error) {
    console.error('Error estimating swap:', error);
    throw new Error('Failed to estimate swap amount');
  }
};

// AMM Swap function
export const swapAMM = (params: AMMSwapParams) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const transactionPayload = sdk.Swap.swapAMMTransactionPayload(params);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return transactionPayload;
  } catch (error) {
    console.error('Error creating AMM swap transaction:', error);
    throw new Error('Failed to create AMM swap transaction');
  }
};

// CLMM Swap function
export const swapCLMM = (params: {
  poolId: string;
  a2b: boolean;
  byAmountIn: boolean;
  amount: number;
  amountLimit: number;
  sqrtPriceLimit?: string;
}) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const transactionPayload = sdk.Swap.swapCLMMTransactionPayload(params);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return transactionPayload;
  } catch (error) {
    console.error('Error creating CLMM swap transaction:', error);
    throw new Error('Failed to create CLMM swap transaction');
  }
};

// Stable Swap function
export const swapStable = (params: {
  poolId: string;
  a2b: boolean;
  fixedAmountIn: boolean;
  amount0: number;
  amount1: number;
}) => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const transactionPayload = sdk.Swap.swapStableTransactionPayload(params);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return transactionPayload;
  } catch (error) {
    console.error('Error creating stable swap transaction:', error);
    throw new Error('Failed to create stable swap transaction');
  }
};

// Get pool information
// export const getPoolInfo = async (poolId: string): Promise<PoolInfo> => {
//   try {
//     // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
//     const poolInfo = await sdk.Pool.getPoolInfo(poolId);
//     return {
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
//       poolId: poolInfo.poolId,
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
//       tokenA: poolInfo.tokens[0]?.token0 || '',
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
//       tokenB: poolInfo.tokens[1]?.token1 || '',
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
//       fee: poolInfo.fee,
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
//       liquidity: poolInfo.tvl,
//       // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
//       sqrtPriceX96: poolInfo.sqrtPriceX96 || '',
//     };
//   } catch (error) {
//     console.error('Error getting pool info:', error);
//     throw new Error(`Failed to get pool info for ${poolId}`);
//   }
// };

// Get all pools
export const getAllPools = async (): Promise<PoolInfo[]> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const pools = await sdk.Pool.getPools({
      page: 1,
      size: 10,
      sortBy: 'tvl',
    });
    console.log('>> pools', pools);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return pools;

    // return pools.map((pool: any) => ({
    //   // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    //   poolId: pool.poolId,
    //   // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    //   tokenA: pool.tokenA,
    //   // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    //   tokenB: pool.tokenB,
    //   // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    //   fee: pool.fee,
    //   // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    //   liquidity: pool.liquidity,
    //   // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    //   sqrtPriceX96: pool.sqrtPriceX96,
    // }));
  } catch (error) {
    console.error('Error getting all pools:', error);
    throw new Error('Failed to get pool list');
  }
};

// Utility function to validate swap parameters
export const validateSwapParams = (params: EstimateSwapParams): boolean => {
  if (!params.poolId || !params.amount || params.amount <= 0) {
    return false;
  }
  if (!['input', 'output'].includes(params.field)) {
    return false;
  }
  if (!Array.isArray(params.pair) || params.pair.length !== 2) {
    return false;
  }
  return true;
};

// Export SDK instance for advanced usage
export { sdk };
