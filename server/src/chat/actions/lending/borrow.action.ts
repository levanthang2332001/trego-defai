import { ChatResponse } from 'src/chat/entities/chat.entity';
import { BorrowParams } from '../../entities/intent.entity';
import { AbstractBaseAction } from '../base/base-action';

export class BorrowAction extends AbstractBaseAction<BorrowParams> {
  readonly name = 'borrow';
  readonly similar = [
    'borrow',
    'loan',
    'take loan',
    'get loan',
    'borrow tokens',
  ];
  readonly prompt = `Extract the following parameters for a borrow action as JSON:
    {
      "token": "string - the token to borrow (e.g., 'USDC', 'ETH')",
      "amount": "number - the amount to borrow (must be positive)",
      "collateralToken": "string - the collateral token (optional, e.g., 'ETH', 'WBTC')",
      "collateralAmount": "number - the collateral amount (optional)",
      "ltv": "number - desired loan-to-value ratio in percentage (optional, e.g., 75)"
    }`;

  readonly examples = [
    'Borrow 1000 USDC with ETH collateral',
    'Take loan of 500 DAI using 1 ETH as collateral',
    'Borrow 0.1 WBTC with 75% LTV',
  ];

  // eslint-disable-next-line @typescript-eslint/require-await
  async handle(params: BorrowParams): Promise<ChatResponse> {
    try {
      // TODO: Implement actual borrowing logic
      const result = {
        action: 'borrow',
        token: params.token,
        amount: params.amount,
        collateralToken: params.collateralToken,
        collateralAmount: params.collateralAmount,
        ltv: params.ltv,
        timestamp: new Date().toISOString(),
        estimatedInterestRate: '5.2%', // Mock data
        liquidationPrice:
          params.collateralAmount && params.amount
            ? (params.amount * 1.2).toFixed(2) // Mock calculation
            : undefined,
      };

      return this.createSuccessResult({
        message: 'Borrowing successful',
        data: result,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Failed to process borrow request: ${errorMessage}`,
      );
    }
  }

  validateMissingParams(params: Partial<BorrowParams>): string[] {
    const missing: string[] = [];

    const tokenError = this.validateString(params.token, 'token');
    if (tokenError) missing.push(tokenError);

    const amountError = this.validateNumber(params.amount, 'amount');
    if (amountError) missing.push(amountError);

    // collateralToken, collateralAmount, and ltv are optional

    return missing;
  }

  validateParams(params: BorrowParams): boolean {
    const missingFields = this.validateMissingParams(params);

    // Additional validation: LTV should be between 1 and 95 if provided
    if (params.ltv !== undefined && (params.ltv <= 0 || params.ltv >= 100)) {
      return false;
    }

    // If collateralAmount is provided, it should be positive
    if (params.collateralAmount !== undefined && params.collateralAmount <= 0) {
      return false;
    }

    return missingFields.length === 0;
  }
}

export const borrowAction = new BorrowAction();
