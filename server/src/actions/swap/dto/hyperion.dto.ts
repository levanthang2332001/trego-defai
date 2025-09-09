import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsString,
} from 'class-validator';

export class PreSwapHyperionRequestDto {
  @ApiProperty({
    example: {
      tokenAddress: '0x1::aptos_coin::AptosCoin',
      faAddress: '0xa',
      name: 'Aptos Coin',
      symbol: 'APT',
      decimals: 8,
    },
    description: 'Source token ',
  })
  @IsObject()
  @IsNotEmpty()
  fromToken: {
    tokenAddress: string;
    faAddress: string;
    name: string;
    symbol: string;
    decimals: number;
  };

  @ApiProperty({
    example: '1000000',
    description: 'Amount of source token to swap',
  })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({
    example: {
      tokenAddress: '0x1::aptos_coin::AptosCoin',
      faAddress: '0xa',
      name: 'Aptos Coin',
      symbol: 'APT',
      decimals: 8,
    },
    description: 'Source token ',
  })
  @IsObject()
  @IsNotEmpty()
  toToken: {
    tokenAddress: string;
    faAddress: string;
    name: string;
    symbol: string;
    decimals: number;
  };
}

export class SwapHyperionRequestDto {
  @ApiProperty({
    example: {
      tokenAddress: '0x1::aptos_coin::AptosCoin',
      faAddress: '0xa',
      name: 'Aptos Coin',
      symbol: 'APT',
      decimals: 8,
    },
    description: 'Source token ',
  })
  @IsObject()
  @IsNotEmpty()
  fromToken: {
    tokenAddress: string;
    faAddress: string;
    name: string;
    symbol: string;
    decimals: number;
  };

  @ApiProperty({
    example: {
      tokenAddress: '0x1::aptos_coin::AptosCoin',
      faAddress: '0xa',
      name: 'Aptos Coin',
      symbol: 'APT',
      decimals: 8,
    },
    description: 'Source token ',
  })
  @IsObject()
  @IsNotEmpty()
  toToken: {
    tokenAddress: string;
    faAddress: string;
    name: string;
    symbol: string;
    decimals: number;
  };

  @ApiProperty({
    example: '1000000',
    description: 'Amount of source token to swap',
  })
  @IsString()
  @IsNotEmpty()
  amountIn: string;

  @ApiProperty({
    example: '1000000',
    description: 'Amount of destination token to swap',
  })
  @IsString()
  @IsNotEmpty()
  amountOut: string;

  @ApiProperty({
    example: [
      '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
    ],
    description: 'Path of tokens to swap',
  })
  @IsArray()
  @IsNotEmpty()
  path: string[];

  @ApiProperty({
    example: 0.5,
    description: 'Slippage tolerance percentage',
  })
  @IsNumber()
  @IsNotEmpty()
  slippage: number;

  @ApiProperty({
    example:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    description: 'Recipient address',
  })
  @IsString()
  @IsNotEmpty()
  recipient: string;
}
