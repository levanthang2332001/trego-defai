import { ApiProperty } from '@nestjs/swagger';

export class SwapParamsSchema {
  @ApiProperty({
    example: 'USDT',
    description: 'Source token for the swap',
  })
  fromToken: string;

  @ApiProperty({
    example: 'ETH',
    description: 'Destination token for the swap',
  })
  toToken: string;

  @ApiProperty({
    example: 100,
    description: 'Amount to swap',
    type: 'number',
  })
  amount: number;
}

export class LiquidityParamsSchema {
  @ApiProperty({
    example: 'USDT',
    description: 'First token for liquidity provision',
  })
  tokenA: string;

  @ApiProperty({
    example: 'ETH',
    description: 'Second token for liquidity provision',
  })
  tokenB: string;

  @ApiProperty({
    example: 1000,
    description: 'Amount of token A',
    type: 'number',
  })
  amountA: number;

  @ApiProperty({
    example: 0.5,
    description: 'Amount of token B',
    type: 'number',
  })
  amountB: number;
}

export class StakingParamsSchema {
  @ApiProperty({
    example: 'USDT',
    description: 'Token to stake',
  })
  token: string;

  @ApiProperty({
    example: 500,
    description: 'Amount to stake',
    type: 'number',
  })
  amount: number;

  @ApiProperty({
    example: 30,
    description: 'Staking duration in days (optional)',
    type: 'number',
    required: false,
  })
  duration?: number;
}

export class UnStakingParamsSchema {
  @ApiProperty({
    example: 'USDT',
    description: 'Token to unstake',
  })
  token: string;
}

export class BorrowParamsSchema {
  @ApiProperty({
    example: 'USDC',
    description: 'Token to borrow',
  })
  token: string;

  @ApiProperty({
    example: 1000,
    description: 'Amount to borrow',
    type: 'number',
  })
  amount: number;

  @ApiProperty({
    example: 'ETH',
    description: 'Collateral token (optional)',
    required: false,
  })
  collateralToken?: string;

  @ApiProperty({
    example: 1.5,
    description: 'Collateral amount (optional)',
    type: 'number',
    required: false,
  })
  collateralAmount?: number;

  @ApiProperty({
    example: 75,
    description: 'Loan-to-value ratio in percentage (optional)',
    type: 'number',
    required: false,
  })
  ltv?: number;
}

export class SupplyParamsSchema {
  @ApiProperty({
    example: 'USDC',
    description: 'Token to lend/supply',
  })
  token: string;

  @ApiProperty({
    example: 1000,
    description: 'Amount to lend',
    type: 'number',
  })
  amount: number;

  @ApiProperty({
    example: 30,
    description: 'Lending duration in days (optional)',
    type: 'number',
    required: false,
  })
  duration?: number;

  @ApiProperty({
    example: 5.5,
    description: 'Desired minimum interest rate in percentage (optional)',
    type: 'number',
    required: false,
  })
  interestRate?: number;
}

export class RepayParamsSchema {
  @ApiProperty({
    example: 'USDC',
    description: 'Token to repay',
  })
  token: string;

  @ApiProperty({
    example: 500,
    description: "Amount to repay (or 'max')",
    oneOf: [{ type: 'number' }, { type: 'string' }],
  })
  amount: number | 'max';

  @ApiProperty({
    example: 'wallet',
    description: "Where to repay from (e.g., 'wallet', 'deposited collateral')",
    required: false,
  })
  repayFrom?: 'wallet' | 'deposited collateral';
}

export class WithdrawParamsSchema {
  @ApiProperty({
    example: 'USDC',
    description: 'Token to withdraw',
  })
  token: string;

  @ApiProperty({
    example: 200,
    description: "Amount to withdraw (or 'max')",
    oneOf: [{ type: 'number' }, { type: 'string' }],
  })
  amount: number | 'max';
}

export class ClaimRewardParamsSchema {
  @ApiProperty({
    example: 'THALA',
    description: 'Token reward to claim (optional)',
    required: false,
  })
  token?: string;

  @ApiProperty({
    example: 'Amnis',
    description: 'Platform from which to claim rewards (optional)',
    required: false,
  })
  platform?: string;
}

export class PlaceLimitOrderParamsSchema {
  @ApiProperty({ example: 'BTC', description: 'Token to trade' })
  token: string;

  @ApiProperty({ example: 1, description: 'Amount to trade' })
  amount: number;

  @ApiProperty({ example: 60000, description: 'Price for the limit order' })
  price: number;

  @ApiProperty({
    example: 'buy',
    description: "Order side ('buy' or 'sell')",
    enum: ['buy', 'sell'],
  })
  side: 'buy' | 'sell';
}

export class PlaceMarketOrderParamsSchema {
  @ApiProperty({ example: 'ETH', description: 'Token to trade' })
  token: string;

  @ApiProperty({ example: 10, description: 'Amount to trade' })
  amount: number;

  @ApiProperty({
    example: 'sell',
    description: "Order side ('buy' or 'sell')",
    enum: ['buy', 'sell'],
  })
  side: 'buy' | 'sell';
}

export class RemoveLiquidityParamsSchema {
  @ApiProperty({
    example: 'USDT',
    description: 'First token in the liquidity pair',
  })
  tokenA: string;

  @ApiProperty({
    example: 'ETH',
    description: 'Second token in the liquidity pair',
  })
  tokenB: string;

  @ApiProperty({
    example: 50,
    description: 'Amount of LP tokens to remove',
    type: 'number',
  })
  liquidityAmount: number;

  @ApiProperty({
    example: 100,
    description: 'Minimum amount of tokenA to receive (optional)',
    type: 'number',
    required: false,
  })
  minAmountA?: number;

  @ApiProperty({
    example: 0.05,
    description: 'Minimum amount of tokenB to receive (optional)',
    type: 'number',
    required: false,
  })
  minAmountB?: number;
}

export class BridgeParamsSchema {
  @ApiProperty({ example: 'USDT', description: 'Token to bridge' })
  tokenA: string;

  @ApiProperty({ example: 'USDC', description: 'Token to bridge' })
  tokenB: string;

  @ApiProperty({ example: 'aptos', description: 'Source chain key' })
  srcChainKey: string;

  @ApiProperty({ example: 'evm', description: 'Destination chain key' })
  dstChainKey: string;

  @ApiProperty({ example: '100', description: 'Amount to bridge' })
  amount: string;

  @ApiProperty({
    example: '0x1234567890123456789012345678901234567890',
    description: 'Destination address',
  })
  dstAddress: string;

  @ApiProperty({
    example: '0x1234567890123456789012345678901234567890',
    description: 'User wallet address',
  })
  user_address: string;
}

export class HelpParamsSchema {
  @ApiProperty({
    example: 'bridge',
    description: 'The topic or feature the user needs help with',
  })
  topic: string;

  @ApiProperty({
    example: 'How to bridge tokens between chains',
    description: 'The specific help request',
  })
  request: string;
}

export class DeFiIntentSchema {
  @ApiProperty({
    example: 'swap',
    description: 'Type of DeFi action',
    enum: [
      'bridge',
      'pre_swap',
      'swap',
      'liquidity',
      'staking',
      'unstaking',
      'borrow',
      'supply',
      'repay',
      'withdraw',
      'remove_liquidity',
      'claim_reward',
      'place_limit_order',
      'place_market_order',
      'unknown',
      'help',
    ],
  })
  actionType:
    | 'bridge'
    | 'pre_swap'
    | 'swap'
    | 'liquidity'
    | 'staking'
    | 'unstaking'
    | 'borrow'
    | 'supply'
    | 'repay'
    | 'withdraw'
    | 'remove_liquidity'
    | 'claim_reward'
    | 'place_limit_order'
    | 'place_market_order'
    | 'unknown'
    | 'help';

  @ApiProperty({
    description: 'Parameters for the action',
    oneOf: [
      { $ref: '#/components/schemas/SwapParamsSchema' },
      { $ref: '#/components/schemas/LiquidityParamsSchema' },
      { $ref: '#/components/schemas/StakingParamsSchema' },
      { $ref: '#/components/schemas/BorrowParamsSchema' },
      { $ref: '#/components/schemas/SupplyParamsSchema' },
      { $ref: '#/components/schemas/RepayParamsSchema' },
      { $ref: '#/components/schemas/WithdrawParamsSchema' },
      { $ref: '#/components/schemas/ClaimRewardParamsSchema' },
      { $ref: '#/components/schemas/PlaceLimitOrderParamsSchema' },
      { $ref: '#/components/schemas/PlaceMarketOrderParamsSchema' },
      { $ref: '#/components/schemas/RemoveLiquidityParamsSchema' },
      { $ref: '#/components/schemas/BridgeParamsSchema' },
      { $ref: '#/components/schemas/HelpParamsSchema' },
    ],
  })
  params:
    | SwapParamsSchema
    | LiquidityParamsSchema
    | StakingParamsSchema
    | UnStakingParamsSchema
    | BorrowParamsSchema
    | SupplyParamsSchema
    | RepayParamsSchema
    | WithdrawParamsSchema
    | ClaimRewardParamsSchema
    | PlaceLimitOrderParamsSchema
    | PlaceMarketOrderParamsSchema
    | RemoveLiquidityParamsSchema
    | BridgeParamsSchema
    | HelpParamsSchema;

  @ApiProperty({
    example: 0.95,
    description: 'Confidence score of the intent extraction (0-1)',
    type: 'number',
    minimum: 0,
    maximum: 1,
  })
  confidence: number;

  @ApiProperty({
    example: ['amount'],
    description: 'Missing required fields for the action',
    type: 'array',
    items: { type: 'string' },
  })
  missingFields: string[];

  @ApiProperty({
    example: 'User wants to swap USDT for ETH',
    description: 'Context extracted from the message',
  })
  context: string;
}
