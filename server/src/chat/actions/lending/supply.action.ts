import { ChatResponse } from 'src/chat/entities/chat.entity';
import { SupplyParams } from '../../entities/intent.entity';
import { AbstractBaseAction } from '../base/base-action';

export class SupplyAction extends AbstractBaseAction<SupplyParams> {
  readonly name = 'supply';
  readonly similar = [
    'supply',
    'lend',
    'deposit',
    'provide liquidity for lending',
  ];
  readonly prompt = `Extract the following parameters for a lending (supply) action as JSON:
    {
      "token": "string - the token to supply (e.g., 'USDC', 'ETH')",
      "amount": "number - the amount to supply (must be positive)",
      "duration": "number - lending duration in days (optional)",
      "interestRate": "number - desired interest rate in percentage (optional)"
    }`;

  readonly examples = [
    'Lend 1000 USDC for 30 days',
    'Supply 10 ETH to the lending pool',
    'Deposit 5000 DAI with a target interest rate of 5%',
  ];

  // eslint-disable-next-line @typescript-eslint/require-await
  async handle(params: SupplyParams): Promise<ChatResponse> {
    try {
      // TODO: Implement actual lending/supplying logic
      const result = {
        action: 'supply',
        ...params,
        timestamp: new Date().toISOString(),
        apy: '4.5%', // Mock data
      };

      return this.createSuccessResult({
        message: 'Lending/supplying successful',
        data: result,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Failed to process supply request: ${errorMessage}`,
      );
    }
  }

  validateMissingParams(params: Partial<SupplyParams>): string[] {
    const missing: string[] = [];
    if (!params.token) missing.push('token');
    if (params.amount === undefined || params.amount <= 0) {
      missing.push('amount');
    }
    return missing;
  }

  validateParams(params: SupplyParams): boolean {
    const missingFields = this.validateMissingParams(params);

    // Additional validation: duration should be positive if provided
    if (params.duration !== undefined && params.duration <= 0) {
      return false;
    }

    // Interest rate should be reasonable if provided (0-100%)
    if (
      params.interestRate !== undefined &&
      (params.interestRate < 0 || params.interestRate > 100)
    ) {
      return false;
    }

    return missingFields.length === 0;
  }
}

export const supplyAction = new SupplyAction();
