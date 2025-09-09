import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class TappTokenDto {
  @ApiProperty({
    example: '0x1::aptos_coin::AptosCoin',
    description: 'Token address',
  })
  @IsString()
  @IsNotEmpty()
  tokenAddress: string;

  @ApiProperty({
    example: '0xa',
    description: 'Fungible asset address',
  })
  @IsString()
  @IsNotEmpty()
  faAddress: string;

  @ApiProperty({
    example: 'Aptos Coin',
    description: 'Token name',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'APT',
    description: 'Token symbol',
  })
  @IsString()
  @IsNotEmpty()
  symbol: string;

  @ApiProperty({
    example: 8,
    description: 'Token decimals',
  })
  @IsNumber()
  @IsNotEmpty()
  decimals: number;
}

export class PreSwapTappExchangeRequestDto {
  @ApiProperty({
    type: TappTokenDto,
    description: 'Source token details',
  })
  @IsObject()
  @IsNotEmpty()
  fromToken: TappTokenDto;

  @ApiProperty({
    type: TappTokenDto,
    description: 'Destination token details',
  })
  @IsObject()
  @IsNotEmpty()
  toToken: TappTokenDto;

  @ApiProperty({
    example: '1000000',
    description: 'Amount of source token to swap (in smallest units)',
  })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    example: true,
    description: 'Direction of swap (true = A to B, false = B to A)',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  a2b?: boolean;

  @ApiProperty({
    example: 'input',
    description: 'Field type for amount calculation',
    enum: ['input', 'output'],
    required: false,
  })
  @IsString()
  @IsOptional()
  field?: 'input' | 'output';
}

export class SwapTappExchangeRequestDto {
  @ApiProperty({
    type: TappTokenDto,
    description: 'Source token details',
  })
  @IsObject()
  @IsNotEmpty()
  fromToken: TappTokenDto;

  @ApiProperty({
    type: TappTokenDto,
    description: 'Destination token details',
  })
  @IsObject()
  @IsNotEmpty()
  toToken: TappTokenDto;

  @ApiProperty({
    example: '1000000',
    description: 'Input amount for swap',
  })
  @IsString()
  @IsNotEmpty()
  amountIn: string;

  @ApiProperty({
    example: '950000',
    description: 'Expected output amount',
  })
  @IsString()
  @IsNotEmpty()
  amountOut: string;

  @ApiProperty({
    example: '0x1234567890abcdef...',
    description: 'Pool ID for the swap',
  })
  @IsString()
  @IsNotEmpty()
  poolId: string;

  @ApiProperty({
    example: true,
    description: 'Direction of swap (true = A to B, false = B to A)',
  })
  @IsBoolean()
  @IsNotEmpty()
  a2b: boolean;

  @ApiProperty({
    example: 0.5,
    description: 'Slippage tolerance percentage',
  })
  @IsNumber()
  @IsNotEmpty()
  slippage: number;

  @ApiProperty({
    example: 'AMM',
    description: 'Swap type',
    enum: ['AMM', 'CLMM', 'STABLE'],
  })
  @IsString()
  @IsNotEmpty()
  swapType: 'AMM' | 'CLMM' | 'STABLE';

  @ApiProperty({
    example: true,
    description: 'Whether the amount is fixed input (true) or output (false)',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  fixedAmountIn?: boolean;

  @ApiProperty({
    example: '1000000000000',
    description: 'Square root price limit for CLMM swaps',
    required: false,
  })
  @IsString()
  @IsOptional()
  sqrtPriceLimit?: string;
}

export class RouteRequestDto {
  @ApiProperty({
    example: '0x1::aptos_coin::AptosCoin',
    description: 'Source token address',
  })
  @IsString()
  @IsNotEmpty()
  token0: string;

  @ApiProperty({
    example: '0x2::usdc::USDC',
    description: 'Destination token address',
  })
  @IsString()
  @IsNotEmpty()
  token1: string;
}

export class PoolInfoRequestDto {
  @ApiProperty({
    example: '0x1234567890abcdef...',
    description: 'Pool ID to get information for',
  })
  @IsString()
  @IsNotEmpty()
  poolId: string;
}
