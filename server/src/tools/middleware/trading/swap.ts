import { PanoraRouter } from '../../panora/swap';
import { preSwap as hyperionPreSwap } from '../../hyperion/swap';
import type { PreSwapParams } from '../../panora/type';
import type { PreSwap as HyperionPreSwap } from '../../hyperion/type';

export enum SwapProvider {
  PANORA = 'panora',
  HYPERION = 'hyperion',
}

export interface UnifiedTokenInfo {
  address: string;
  faAddress?: string;
  symbol: string;
  name: string;
  decimals: number;
}

export interface UnifiedPreSwapParams {
  provider: SwapProvider;
  fromToken: UnifiedTokenInfo;
  toToken: UnifiedTokenInfo;
  amount: string;
  slippage?: number;
  recipient?: string;
  chainId?: string;
}

export interface UnifiedPreSwapResult {
  provider: SwapProvider;
  amountIn: string;
  amountOut: string;
  amountInUsd?: number;
  amountOutUsd?: number;
  path?: string[];
  slippage?: number;
  estimatedGas?: string;
  quotes?: any[];
  fromToken?: any;
  toToken?: any;
}

export class SwapMiddleware {
  static async preSwapQuote(
    params: UnifiedPreSwapParams,
  ): Promise<UnifiedPreSwapResult> {
    try {
      switch (params.provider) {
        case SwapProvider.PANORA:
          return await this.handlePanoraPreSwap(params);

        case SwapProvider.HYPERION:
          return await this.handleHyperionPreSwap(params);

        default:
          throw new Error(
            `Unsupported swap provider: ${String(params.provider)}`,
          );
      }
    } catch (error) {
      console.error(`Pre-swap quote failed for ${params.provider}:`, error);
      throw new Error(
        `Pre-swap failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private static async handlePanoraPreSwap(
    params: UnifiedPreSwapParams,
  ): Promise<UnifiedPreSwapResult> {
    const panoraParams: PreSwapParams = {
      chainId: params.chainId || '1',
      fromTokenAddress: params.fromToken.address as `0x${string}`,
      toTokenAddress: params.toToken.address as `0x${string}`,
      fromTokenAmount: params.amount,
      toWalletAddress: params.recipient as `0x${string}`,
      slippagePercentage: params.slippage?.toString(),
    };

    const result = await PanoraRouter.preSwapQuote(panoraParams);

    // Handle both MaxToTokenQuote and MinFromTokenQuote response types
    let amountIn = params.amount;
    let amountOut = '0';
    let amountInUsd = 0;
    let amountOutUsd = 0;
    let route: any[] = [];

    // Check if this is a MaxToTokenQuote response
    if ('fromTokenAmount' in result && 'fromTokenAmountUSD' in result) {
      amountIn = result.fromTokenAmount;
      amountInUsd = parseFloat(result.fromTokenAmountUSD || '0');

      if (result.quotes && result.quotes.length > 0) {
        const firstQuote = result.quotes[0];
        if ('toTokenAmount' in firstQuote) {
          amountOut = firstQuote.toTokenAmount;
          amountOutUsd = parseFloat(firstQuote.toTokenAmountUSD || '0');
          route = firstQuote.route || [];
        }
      }
    }
    // Handle MinFromTokenQuote response
    else if ('toTokenAmount' in result && 'toTokenAmountUSD' in result) {
      amountOut = result.toTokenAmount;
      amountOutUsd = parseFloat(result.toTokenAmountUSD || '0');

      if (result.quotes && result.quotes.length > 0) {
        const firstQuote = result.quotes[0];
        if ('fromTokenAmount' in firstQuote) {
          amountIn = firstQuote.fromTokenAmount;
          amountInUsd = parseFloat(firstQuote.fromTokenAmountUSD || '0');
          route = firstQuote.route || [];
        }
      }
    }

    return {
      provider: SwapProvider.PANORA,
      amountIn,
      amountOut,
      amountInUsd,
      amountOutUsd,
      path: route,
      slippage: params.slippage,
      quotes: result.quotes,
      fromToken: result.fromToken,
      toToken: result.toToken,
    };
  }

  private static async handleHyperionPreSwap(
    params: UnifiedPreSwapParams,
  ): Promise<UnifiedPreSwapResult> {
    const hyperionParams: HyperionPreSwap = {
      fromToken: {
        tokenAddress: params.fromToken.address,
        faAddress: params.fromToken.faAddress || params.fromToken.address,
        name: params.fromToken.name,
        symbol: params.fromToken.symbol,
        decimals: params.fromToken.decimals,
      },
      amount: params.amount,
      toToken: {
        tokenAddress: params.toToken.address,
        faAddress: params.toToken.faAddress || params.toToken.address,
        name: params.toToken.name,
        symbol: params.toToken.symbol,
        decimals: params.toToken.decimals,
      },
    };

    const result = await hyperionPreSwap(hyperionParams);

    return {
      provider: SwapProvider.HYPERION,
      amountIn: result.amountIn,
      amountOut: result.amountOut,
      amountInUsd: result.amountInUsd,
      amountOutUsd: result.amountOutUsd,
      path: result.path,
      slippage: params.slippage,
    };
  }

  static validateSwapParams(params: UnifiedPreSwapParams): void {
    if (!params.provider) {
      throw new Error('Swap provider is required');
    }

    if (!Object.values(SwapProvider).includes(params.provider)) {
      throw new Error(`Invalid swap provider: ${params.provider}`);
    }

    if (!params.fromToken?.address) {
      throw new Error('From token address is required');
    }

    if (!params.toToken?.address) {
      throw new Error('To token address is required');
    }

    if (!params.amount || parseFloat(params.amount) <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    if (params.slippage && (params.slippage < 0 || params.slippage > 100)) {
      throw new Error('Slippage must be between 0 and 100');
    }
  }

  static getSupportedProviders(): SwapProvider[] {
    return Object.values(SwapProvider);
  }

  static isProviderSupported(provider: string): provider is SwapProvider {
    return Object.values(SwapProvider).includes(provider as SwapProvider);
  }
}

export async function preSwapMiddleware(
  params: UnifiedPreSwapParams,
): Promise<UnifiedPreSwapResult> {
  SwapMiddleware.validateSwapParams(params);
  return await SwapMiddleware.preSwapQuote(params);
}

export default SwapMiddleware;
