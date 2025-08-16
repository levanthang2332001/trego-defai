import { ChatResponse } from 'src/chat/entities/chat.entity';
import { PlaceMarketOrderParams } from '../../entities/intent.entity';
import { AbstractBaseAction } from '../base/base-action';

export class PlaceMarketOrderAction extends AbstractBaseAction<PlaceMarketOrderParams> {
  readonly name = 'place_market_order';
  readonly similar = [
    'market order',
    'place a market order',
    'execute a market order',
  ];
  readonly prompt = `Extract the following parameters for a place market order action as JSON:
    {
      "token": "string - the token to trade (e.g., 'BTC', 'ETH')",
      "amount": "number - the amount to trade",
      "side": "string - either 'buy' or 'sell'"
    }`;

  readonly examples = [
    'Place a market order to buy 1 BTC',
    'Execute a market sell for 10 ETH',
  ];

  // eslint-disable-next-line @typescript-eslint/require-await
  async handle(params: PlaceMarketOrderParams): Promise<ChatResponse> {
    try {
      // TODO: Implement actual market order logic
      const result = {
        action: 'place_market_order',
        ...params,
        timestamp: new Date().toISOString(),
        orderStatus: 'filled',
        filledPrice: '60500.50', // Mock data
      };

      return this.createSuccessResult({
        message: 'Market order placed successfully',
        data: result,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Failed to place market order: ${errorMessage}`,
      );
    }
  }

  validateMissingParams(params: Partial<PlaceMarketOrderParams>): string[] {
    const missing: string[] = [];
    if (!params.token) missing.push('token');
    if (params.amount === undefined || params.amount <= 0)
      missing.push('amount');
    if (!params.side || !['buy', 'sell'].includes(params.side))
      missing.push('side');
    return missing;
  }
}

export const placeMarketOrderAction = new PlaceMarketOrderAction();
