import { ChatResponse } from 'src/chat/entities/chat.entity';
import { RemoveLiquidityParams } from '../../entities/intent.entity';
import { AbstractBaseAction } from '../base/base-action';

export class RemoveLiquidityAction extends AbstractBaseAction<RemoveLiquidityParams> {
  readonly name = 'remove_liquidity';
  readonly similar = [
    'remove liquidity',
    'withdraw liquidity',
    'exit pool',
    'unstake LP',
    'withdraw from pool',
  ];
  readonly prompt = `Extract the following parameters for removing liquidity as JSON:
    {
      "tokenA": "string - the first token in the pair (e.g., 'ETH', 'USDC')",
      "tokenB": "string - the second token in the pair (e.g., 'ETH', 'USDC')",
      "liquidityAmount": "number - the amount of LP tokens to remove (must be positive)",
      "minAmountA": "number - minimum amount of tokenA to receive (optional, for slippage protection)",
      "minAmountB": "number - minimum amount of tokenB to receive (optional, for slippage protection)"
    }`;

  readonly examples = [
    'Remove 50 LP tokens from ETH/USDC pool',
    'Withdraw all liquidity from DAI/USDC pool',
    'Exit 25% of my WBTC/ETH position',
  ];

  // eslint-disable-next-line @typescript-eslint/require-await
  async handle(params: RemoveLiquidityParams): Promise<ChatResponse> {
    try {
      // TODO: Implement actual liquidity removal logic
      const result = {
        action: 'remove_liquidity',
        tokenA: params.tokenA,
        tokenB: params.tokenB,
        liquidityAmount: params.liquidityAmount,
        minAmountA: params.minAmountA,
        minAmountB: params.minAmountB,
        timestamp: new Date().toISOString(),
        // Mock estimated returns
        estimatedTokenAReturn: params.liquidityAmount * 0.5, // Mock calculation
        estimatedTokenBReturn: params.liquidityAmount * 0.5, // Mock calculation
        slippageTolerance: '1%',
        fees: {
          networkFee: '0.001 ETH',
          protocolFee: '0.25%',
        },
      };

      return this.createSuccessResult({
        message: 'Liquidity removed successfully',
        data: result,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Failed to remove liquidity: ${errorMessage}`,
      );
    }
  }

  validateMissingParams(params: Partial<RemoveLiquidityParams>): string[] {
    const missing: string[] = [];

    const tokenAError = this.validateString(params.tokenA, 'tokenA');
    if (tokenAError) missing.push(tokenAError);

    const tokenBError = this.validateString(params.tokenB, 'tokenB');
    if (tokenBError) missing.push(tokenBError);

    const liquidityAmountError = this.validateNumber(
      params.liquidityAmount,
      'liquidityAmount',
    );
    if (liquidityAmountError) missing.push(liquidityAmountError);

    // minAmountA and minAmountB are optional

    return missing;
  }

  validateParams(params: RemoveLiquidityParams): boolean {
    const missingFields = this.validateMissingParams(params);

    // Additional validation: minimum amounts should be positive if provided
    if (params.minAmountA !== undefined && params.minAmountA <= 0) {
      return false;
    }

    if (params.minAmountB !== undefined && params.minAmountB <= 0) {
      return false;
    }

    // Ensure tokenA and tokenB are different
    if (
      params.tokenA &&
      params.tokenB &&
      params.tokenA.toLowerCase() === params.tokenB.toLowerCase()
    ) {
      return false;
    }

    return missingFields.length === 0;
  }
}

export const removeLiquidityAction = new RemoveLiquidityAction();
