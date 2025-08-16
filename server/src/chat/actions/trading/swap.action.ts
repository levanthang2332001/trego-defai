import { ChatResponse } from 'src/chat/entities/chat.entity';
import { ActionType, SwapParams } from '../../entities/intent.entity';
import { AbstractBaseAction } from '../base/base-action';
import { calculateLiquidswapRate } from 'src/tools/liquidswap/swap';
import { CurveType } from '@pontem/liquidswap-sdk/dist/tsc/types/aptos';

export class SwapAction extends AbstractBaseAction<SwapParams> {
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

      const payload = {
        fromToken,
        toToken,
        amount,
        curveType: 'stable' as CurveType,
        interactiveToken: 'from' as 'from' | 'to',
        version: 0,
      };

      const toAmount = await calculateLiquidswapRate(payload);

      if (!toAmount) {
        return this.createErrorResult('Failed to calculate swap rate');
      }

      const result = {
        action: ActionType.PRE_SWAP,
        address: user_address,
        fromToken: params.fromToken,
        toToken: params.toToken,
        fromAmount: params.amount,
        toAmount,
        timestamp: new Date().toISOString(),
      };
      return this.createSuccessResult({
        message: `<h2 class="text-lg font-semibold mb-2">Swap Estimate Ready! 💱</h2>
          <div class="mb-4">
            Please review the details above. If everything looks correct, you can proceed to confirm and execute the swap.
          </div>`,
        data: result,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(`Failed to execute swap: ${errorMessage}`);
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
