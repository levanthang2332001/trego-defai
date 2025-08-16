import { ChatResponse } from 'src/chat/entities/chat.entity';
import { WithdrawParams } from '../../entities/intent.entity';
import { AbstractBaseAction } from '../base/base-action';

export class WithdrawAction extends AbstractBaseAction<WithdrawParams> {
  readonly name = 'withdraw';
  readonly similar = [
    'withdraw',
    'take out',
    'withdraw funds',
    'get my money back',
  ];
  readonly prompt = `Extract the following parameters for a withdraw action as JSON:
    {
      "token": "string - the token to withdraw (e.g., 'USDC', 'ETH')",
      "amount": "number - the amount to withdraw (must be positive, can be 'max' to withdraw all)"
    }`;

  readonly examples = [
    'Withdraw 1000 USDC',
    'Take out all my ETH',
    'Get my deposited DAI back',
  ];

  // eslint-disable-next-line @typescript-eslint/require-await
  async handle(params: WithdrawParams): Promise<ChatResponse> {
    try {
      // TODO: Implement actual withdrawal logic
      const result = {
        action: 'withdraw',
        token: params.token,
        amount: params.amount,
        timestamp: new Date().toISOString(),
        remainingBalance: '500.00', // Mock data
      };

      return this.createSuccessResult({
        message: 'Withdrawal successful',
        data: result,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Failed to process withdraw request: ${errorMessage}`,
      );
    }
  }

  validateMissingParams(params: Partial<WithdrawParams>): string[] {
    const missing: string[] = [];

    const tokenError = this.validateString(params.token, 'token');
    if (tokenError) missing.push(tokenError);

    const amountError = this.validateNumberOrMax(params.amount, 'amount');
    if (amountError) missing.push(amountError);

    return missing;
  }

  validateParams(params: WithdrawParams): boolean {
    const missingFields = this.validateMissingParams(params);
    return missingFields.length === 0;
  }
}

export const withdrawAction = new WithdrawAction();
