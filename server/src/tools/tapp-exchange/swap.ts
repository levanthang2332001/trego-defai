import { initTappSDK, TradeSizeExceedsError } from '@tapp-exchange/sdk';
import { Network } from '@aptos-labs/ts-sdk';

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
const sdk = initTappSDK({
  network: Network.MAINNET,
  url: 'https://....',
}) as any;

export async function getRoute(token0: string, token1: string): Promise<any> {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const poolInfo = await sdk.Swap.getRoute(token0, token1);

  return poolInfo;
}

export const getEstSwap = async (
  poolId: string,
  amount: number,
): Promise<any> => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const result = await sdk.Swap.getEstSwapAmount({
    poolId,
    a2b: true,
    field: 'input' as const,
    amount,
    pair: [0, 1],
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (result.error instanceof TradeSizeExceedsError) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    console.error(result.error.message);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    console.error('max allowed amount', result.error.maxAmountIn);
  }

  return result;
};
