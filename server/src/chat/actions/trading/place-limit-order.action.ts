import { ChatResponse } from 'src/chat/entities/chat.entity';
import { PlaceLimitOrderParams } from '../../entities/intent.entity';
import { AbstractBaseAction } from '../base/base-action';

export class PlaceLimitOrderAction extends AbstractBaseAction<PlaceLimitOrderParams> {
  readonly name = 'place_limit_order';
  readonly similar = [
    'limit order',
    'place a limit order',
    'set a limit order',
  ];
  readonly prompt = `Extract the following parameters for a place limit order action as JSON:
    {
      "token": "string - the token to trade (e.g., 'BTC', 'ETH')",
      "amount": "number - the amount to trade",
      "price": "number - the price to set for the limit order",
      "side": "string - either 'buy' or 'sell'"
    }`;

  readonly examples = [
    'Place a limit order to buy 1 BTC at 60000',
    'Set a limit sell order for 10 ETH at 4000',
  ];

  // eslint-disable-next-line @typescript-eslint/require-await
  async handle(params: PlaceLimitOrderParams): Promise<ChatResponse> {
    try {
      // TODO: Implement actual limit order logic
      const result = {
        action: 'place_limit_order',
        ...params,
        timestamp: new Date().toISOString(),
        orderStatus: 'placed',
      };

      return this.createSuccessResult({
        message: 'Limit order placed successfully',
        data: result,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Failed to place limit order: ${errorMessage}`,
      );
    }
  }

  validateMissingParams(params: Partial<PlaceLimitOrderParams>): string[] {
    const missing: string[] = [];
    if (!params.token) missing.push('token');
    if (params.amount === undefined || params.amount <= 0)
      missing.push('amount');
    if (params.price === undefined || params.price <= 0) missing.push('price');
    if (!params.side || !['buy', 'sell'].includes(params.side))
      missing.push('side');
    return missing;
  }
}

export const placeLimitOrderAction = new PlaceLimitOrderAction();
