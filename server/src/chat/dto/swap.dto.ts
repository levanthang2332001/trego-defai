import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';

enum CurveType {
  STABLE = 'stable',
  UNCORRELATED = 'uncorrelated',
}

export class SwapRequestDto {
  @ApiProperty({
    example:
      '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
    description:
      'User Aptos wallet address in hexadecimal format (must start with 0x)',
    minLength: 66,
    maxLength: 66,
  })
  @IsString()
  @IsNotEmpty()
  user_address: string;

  @ApiProperty({
    example: '0x1::aptos_coin::AptosCoin',
    description:
      'Source token address to swap from (full Aptos token address format)',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  fromToken: string;

  @ApiProperty({
    example:
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT',
    description:
      'Destination token address to swap to (full Aptos token address format)',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  toToken: string;

  @ApiProperty({
    example: 1000000,
    description:
      'Amount to swap in the smallest unit of the from token (e.g., 1000000 = 0.01 APT with 8 decimals)',
    minimum: 1,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  fromAmount: number;

  @ApiProperty({
    example: 95000,
    description:
      'Expected amount to receive in the smallest unit of the to token (used for validation)',
    minimum: 0,
    required: false,
  })
  @IsNumber()
  @Min(0)
  toAmount?: number;

  @ApiProperty({
    example: 'from',
    description: 'Interactive token side for the swap calculation',
    enum: ['from', 'to'],
    required: false,
  })
  @IsString()
  @MinLength(1)
  interactiveToken?: string;

  @ApiProperty({
    example: 'stable',
    description:
      'Liquidswap curve type - use "stable" for stablecoin pairs, "uncorrelated" for volatile token pairs',
    enum: CurveType,
    required: false,
  })
  @IsEnum(CurveType, {
    message: 'Invalid curve type. Must be either "stable" or "uncorrelated"',
  })
  curveType?: CurveType;

  @ApiProperty({
    example: 0,
    description: 'Liquidswap protocol version - use 0 for v1.0 or 0.5 for v0.5',
    enum: [0, 0.5],
    required: false,
  })
  @IsNumber()
  @Min(0)
  version?: 0 | 0.5;
}

export class SwapResponseDto {
  @ApiProperty({
    example: 'Swap executed successfully',
    description: 'Response message from the swap system',
  })
  message: string;

  @ApiProperty({
    example: {
      transactionHash: '0x1234567890abcdef...',
      estimatedGas: '150000',
      slippage: '0.5%',
    },
    description: 'Additional data returned from the swap action',
    required: false,
  })
  data?: any;
}
