import { ActionType, StakingParams } from '../../entities/intent.entity';
import { AbstractBaseAction } from '../base/base-action';
import { aptosAgent } from '../../../utils/aptosAgent';
import { getTokenByTokenName } from '../../../utils/token';
import { stakeTokensWithThala } from '../../../tools/thala/stake';
import { ChatResponse } from 'src/chat/entities/chat.entity';

export class StakingAction extends AbstractBaseAction<StakingParams> {
  readonly name = 'staking';
  readonly similar = [
    'stake',
    'staking',
    'farm',
    'earn',
    'staking token',
    'yield farming',
  ];
  readonly prompt = `Extract the following parameters for a staking action as JSON:
    {
      "token": "string - the token to stake (e.g., 'ETH', 'USDC')",
      "amount": "number - the amount to stake (must be positive)",
      "duration": "number - the staking duration in days (optional, default: flexible)"
    }`;

  readonly examples = [
    'Stake 100 ETH for 30 days',
    'Farm 1000 USDC',
    'Stake 50 MATIC for rewards',
  ];

  async handle(
    params: StakingParams,
    user_address: string,
  ): Promise<ChatResponse> {
    try {
      const { token, amount } = params;

      const findToken = getTokenByTokenName(token);

      if (!findToken) {
        return this.createErrorResult('Token not found');
      }

      const rawValue = Number(amount);
      if (isNaN(rawValue) || rawValue <= 0) {
        return this.createErrorResult('Invalid value provided');
      }

      const amountInInterger = Math.floor(rawValue * 10 ** findToken.decimals);
      const { aptos, accounts } = await aptosAgent(user_address);

      const data = await stakeTokensWithThala(
        aptos,
        accounts,
        amountInInterger,
      );

      if (!data) {
        return this.createErrorResult('Failed to stake tokens');
      }

      const result = {
        action: ActionType.STAKING,
        token: params.token,
        amount: params.amount,
        duration: params.duration || 'flexible',
        data,
        timestamp: new Date().toISOString(),
      };

      return this.createSuccessResult({
        message: `## 🎉 Staking Successful!

Your tokens have been successfully staked and you're now earning rewards!

### Transaction Details:
- **Token:** ${params.token}
- **Amount:** ${params.amount}
- **Duration:** ${params.duration || 'flexible'}
- **Transaction Hash:** [${data?.hash}](https://explorer.aptoslabs.com/txn/${data?.hash}?network=mainnet)

### What's Next?
- Monitor your staking rewards in your portfolio
- You can unstake anytime (subject to lock period if applicable)

> 💡 **Pro tip:** Consider diversifying your staking across different tokens to maximize your yield potential!`,
        data: result,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(errorMessage);
    }
  }

  validateMissingParams(params: Partial<StakingParams>): string[] {
    const missing: string[] = [];

    const tokenError = this.validateString(params.token, 'token');
    if (tokenError) missing.push(tokenError);

    const amountError = this.validateNumber(params.amount, 'amount');
    if (amountError) missing.push(amountError);

    // duration is optional, no validation needed

    return missing;
  }

  validateParams(params: StakingParams): boolean {
    const missingFields = this.validateMissingParams(params);

    // Additional validation: duration should be positive if provided
    if (params.duration !== undefined && params.duration <= 0) {
      return false;
    }

    return missingFields.length === 0;
  }
}

export const stakingAction = new StakingAction();
