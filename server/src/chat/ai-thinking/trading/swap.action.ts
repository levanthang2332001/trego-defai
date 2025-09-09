import { ChatResponse } from 'src/chat/entities/chat.entity';
import { SwapParams } from 'src/chat/entities/intent.entity';
import { AbstractBaseAction } from '../base/base-action';
import {
  SwapMiddleware,
  UnifiedPreSwapParams,
} from 'src/tools/middleware/trading/swap';
import { getTokenInfo } from 'src/tools/panora/swap';

export class SwapAction extends AbstractBaseAction {
  readonly name = 'swap';
  readonly similar = ['exchange', 'trade', 'swap token', 'convert'];
  readonly prompt = `Extract the following parameters for a swap action as JSON:
    {
      "fromToken": "string - the token to swap from (e.g., 'APT', 'ALT')",
      "toToken": "string - the token to swap to (e.g., 'APT', 'ALT')",
      "amount": "number - the amount to swap (must be positive)"
    }`;

  readonly examples = [
    'Swap 1 APT for ALT',
    'Exchange 0.5 ALT to APT',
    'Trade 1 APT for ALT',
  ];

  async handle(
    params: SwapParams,
    user_address: string,
  ): Promise<ChatResponse> {
    try {
      const { fromToken, toToken, amount } = params;

      // Get token information for both tokens
      const fromTokenInfo = getTokenInfo(fromToken);
      const toTokenInfo = getTokenInfo(toToken);

      // Build common params (provider will be set per iteration)
      const baseParams: Omit<UnifiedPreSwapParams, 'provider'> = {
        fromToken: {
          address: fromTokenInfo.tokenAddress || fromTokenInfo.faAddress || '',
          faAddress: fromTokenInfo.faAddress || '',
          symbol: fromTokenInfo.symbol,
          name: fromTokenInfo.name,
          decimals: fromTokenInfo.decimals,
        },
        toToken: {
          address: toTokenInfo.tokenAddress || toTokenInfo.faAddress || '',
          faAddress: toTokenInfo.faAddress || '',
          symbol: toTokenInfo.symbol,
          name: toTokenInfo.name,
          decimals: toTokenInfo.decimals,
        },
        amount: amount.toString(),
        slippage: 0.5,
        recipient: user_address,
        chainId: '1',
      };

      // Request quotes from all supported providers in parallel
      const providers = SwapMiddleware.getSupportedProviders();
      const settled = await Promise.allSettled(
        providers.map((p) =>
          SwapMiddleware.preSwapQuote({ ...baseParams, provider: p }),
        ),
      );

      const successful = settled
        .filter(
          (
            r,
          ): r is PromiseFulfilledResult<
            ReturnType<typeof SwapMiddleware.preSwapQuote> extends Promise<
              infer U
            >
              ? U
              : never
          > => r.status === 'fulfilled',
        )
        .map((r) => r.value);

      if (successful.length === 0) {
        return this.createErrorResult(
          'Failed to get swap quotes from all providers',
        );
      }

      // Sort by best output amount (descending)
      successful.sort(
        (a, b) => parseFloat(b.amountOut) - parseFloat(a.amountOut),
      );

      const data = successful.map((res) => ({
        provider: res.provider,
        fromToken,
        toToken,
        fromAmount: res.amountIn,
        toAmount: res.amountOut,
        fromAmountUsd: res.amountInUsd ?? 0,
        toAmountUsd: res.amountOutUsd ?? 0,
        slippage: res.slippage || 0.5,
        path: res.path || [],
        timestamp: new Date().toISOString(),
      }));

      const best = data[0];

      return this.createSuccessResult({
        message: `<h2 class="text-lg font-semibold mb-2">Swap Quotes Ready! 💱</h2>
          <div class="space-y-3">
            ${data
              .map(
                (q) => `
            <div class="bg-gray-50 p-4 rounded-lg">
              <div class="flex justify-between items-center mb-2">
                <span class="font-medium">From: ${fromToken}</span>
                <span class="text-lg font-bold">${q.fromAmount}</span>
              </div>
              <div class="flex justify-between items-center">
                <span class="font-medium">To: ${toToken}</span>
                <span class="text-lg font-bold text-green-600">${q.toAmount}</span>
              </div>
              <div class="flex justify-between text-sm text-gray-600 mt-2">
                <span>Value: $${Number(q.fromAmountUsd).toFixed(2)} → $${Number(q.toAmountUsd).toFixed(2)}</span>
                <span>Provider: ${String(q.provider).toUpperCase()}</span>
              </div>
              <div class="text-sm text-gray-500">Slippage: ${(q.slippage || 0.5).toFixed(1)}%</div>
            </div>`,
              )
              .join('')}
          </div>
          <div class="mt-4 text-sm">
            Best by output: <span class="font-semibold">${String(best.provider).toUpperCase()}</span> (${best.toAmount})
          </div>`,
        data,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Failed to get swap quote: ${errorMessage}`,
      );
    }
  }

  validateMissingParams(params: Partial<SwapParams>): string[] {
    const missing: string[] = [];

    const fromTokenError = this.validateString(params.fromToken, 'fromToken');
    if (fromTokenError) missing.push(fromTokenError);

    const toTokenError = this.validateString(params.toToken, 'toToken');
    if (toTokenError) missing.push(toTokenError);

    const amountError = this.validateNumber(params.amount, 'amount');
    if (amountError) missing.push(amountError);

    return missing;
  }
}

export const swapAction = new SwapAction();
