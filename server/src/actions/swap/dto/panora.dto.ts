import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class PreSwapPanoramicRequestDto {
  @ApiProperty({
    example: '1',
    description: 'Chain ID',
  })
  @IsString()
  chainId: string;

  @ApiProperty({
    example: '0x1::aptos_coin::AptosCoin',
    description: 'Source token address',
  })
  @IsString()
  @IsNotEmpty()
  fromTokenAddress: `0x${string}`;

  @ApiProperty({
    example:
      '0xa2eda21a58856fda86451436513b867c97eecb4ba099da5775520e0f7492e065::coin::T',
    description: 'Destination token address',
  })
  @IsString()
  @IsNotEmpty()
  toTokenAddress: `0x${string}`;

  @ApiProperty({
    example: '1000000',
    description: 'Amount of source token to swap',
  })
  @IsString()
  @IsNotEmpty()
  fromTokenAmount: string;

  @ApiProperty({
    example:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    description: 'Destination wallet address',
  })
  @IsString()
  @IsNotEmpty()
  toWalletAddress: `0x${string}`;

  @ApiProperty({
    example: '0.5',
    description: 'Slippage tolerance percentage',
  })
  @IsString()
  @IsNotEmpty()
  slippagePercentage: string;
}

export class SwapPanoramicRequestDto {
  @ApiProperty({
    type: PreSwapPanoramicRequestDto,
    description: 'Swap parameters',
  })
  @IsObject()
  @IsNotEmpty()
  params: PreSwapPanoramicRequestDto;

  @ApiProperty({
    example:
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
    description: 'Private key',
  })
  @IsString()
  @IsNotEmpty()
  privateKey: string;
}
