/* eslint-disable @typescript-eslint/no-unused-vars */
import { ChatResponse } from 'src/chat/entities/chat.entity';
import { ClaimRewardParams } from '../../entities/intent.entity';
import { AbstractBaseAction } from '../base/base-action';

export class ClaimRewardAction extends AbstractBaseAction<ClaimRewardParams> {
  readonly name = 'claim_reward';
  readonly similar = ['claim', 'harvest', 'collect rewards'];
  readonly prompt = `Extract the following parameters for a claim reward action as JSON:
    {
      "token": "string - the token reward to claim (optional, e.g., 'THALA', 'USDC')",
      "platform": "string - the platform from which to claim rewards (optional, e.g., 'Amnis', 'Thala')"
    }`;

  readonly examples = [
    'Claim my rewards',
    'Harvest all my staking rewards',
    'Collect my THALA rewards from Thala',
  ];

  // eslint-disable-next-line @typescript-eslint/require-await
  async handle(params: ClaimRewardParams): Promise<ChatResponse> {
    try {
      // TODO: Implement actual claim reward logic
      const result = {
        action: 'claim_reward',
        ...params,
        timestamp: new Date().toISOString(),
        claimedAmount: '125.50', // Mock data
        claimedToken: params.token || 'all',
      };

      return this.createSuccessResult({
        message: 'Rewards claimed successfully',
        data: result,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Failed to process claim reward request: ${errorMessage}`,
      );
    }
  }

  validateMissingParams(_params: Partial<ClaimRewardParams>): string[] {
    // All params are optional, so we don't need to validate missing params.
    return [];
  }
}

export const claimRewardAction = new ClaimRewardAction();
