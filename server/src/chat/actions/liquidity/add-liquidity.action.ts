import { ChatResponse } from 'src/chat/entities/chat.entity';
import { LiquidityParams } from '../../entities/intent.entity';
import { AbstractBaseAction } from '../base/base-action';

export class AddLiquidityAction extends AbstractBaseAction<LiquidityParams> {
  readonly name = 'liquidity';
  readonly similar = [
    'add liquidity',
    'pool',
    'liquidity pool',
    'provide liquidity',
  ];
  readonly prompt = `Extract the following parameters for adding liquidity as JSON:
    {
      "tokenA": "string - the first token (e.g., 'ETH', 'USDC')",
      "tokenB": "string - the second token (e.g., 'ETH', 'USDC')",
      "amountA": "number - the amount of the first token (must be positive)",
      "amountB": "number - the amount of the second token (must be positive)"
    }`;

  readonly examples = [
    'Add 100 USDC and 0.05 ETH to liquidity pool',
    'Provide liquidity with 1000 DAI and 1000 USDC',
    'Pool 50 WBTC and 1000 ETH',
  ];

  // eslint-disable-next-line @typescript-eslint/require-await
  async handle(params: LiquidityParams): Promise<ChatResponse> {
    try {
      // TODO: Implement actual liquidity addition logic
      const result = {
        action: 'add_liquidity',
        tokenA: params.tokenA,
        tokenB: params.tokenB,
        amountA: params.amountA,
        amountB: params.amountB,
        timestamp: new Date().toISOString(),
      };

      return this.createSuccessResult({
        message: 'Liquidity added successfully',
        data: result,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(`Failed to add liquidity: ${errorMessage}`);
    }
  }

  validateMissingParams(params: Partial<LiquidityParams>): string[] {
    const missing: string[] = [];

    const tokenAError = this.validateString(params.tokenA, 'tokenA');
    if (tokenAError) missing.push(tokenAError);

    const tokenBError = this.validateString(params.tokenB, 'tokenB');
    if (tokenBError) missing.push(tokenBError);

    const amountAError = this.validateNumber(params.amountA, 'amountA');
    if (amountAError) missing.push(amountAError);

    const amountBError = this.validateNumber(params.amountB, 'amountB');
    if (amountBError) missing.push(amountBError);

    return missing;
  }
}

export const liquidityAction = new AddLiquidityAction();
