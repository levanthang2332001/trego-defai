import type PanoraClass from '@panoraexchange/swap-sdk';
import type { PanoraConfig } from '@panoraexchange/swap-sdk';
import { TokenMapping, TokenMappingProp } from './token-mapping';
import { ExactSwapParams, PreSwapParams } from './type';

// Use CommonJS require to avoid interop issues with the SDK's CJS export
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Panora = require('@panoraexchange/swap-sdk') as unknown as {
  new (config: PanoraConfig): PanoraClass;
};

const config: PanoraConfig = {};
const panora: PanoraClass = new Panora(config);

export function getTokenInfo(token: string): TokenMappingProp {
  const tokenInfo = TokenMapping.find(
    (info) =>
      info.symbol.toLowerCase() === token.toLowerCase() ||
      info.name.toLowerCase() === token.toLowerCase(),
  );
  if (!tokenInfo) throw new Error(`Token ${token} not found in TokenMapping`);
  return tokenInfo;
}

export function getTokenAddress(token: string): `0x${string}` | null {
  const tokenInfo = getTokenInfo(token);
  return tokenInfo.faAddress || tokenInfo.tokenAddress;
}

export async function preSwapQuote(data: PreSwapParams) {
  return await panora.SwapQuote({
    params: {
      ...data,
      chainId: data.chainId || '1',
    },
  });
}

export async function exactSwap({ params, privateKey }: ExactSwapParams) {
  return await panora.Swap({
    params: {
      ...params,
      chainId: params.chainId || '1',
    },
    private_key: privateKey,
  });
}

export const PanoraRouter = {
  preSwapQuote,
  exactSwap,
  getTokenInfo,
  getTokenAddress,
};
