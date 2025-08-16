import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsNumber,
  Min,
  IsEnum,
} from 'class-validator';
import { DeFiIntentSchema } from '../docs/schemas';

enum CurveType {
  STABLE = 'stable',
  UNCORRELATED = 'uncorrelated',
}

export class ChatRequestDto {
  @ApiProperty({
    example: '0x1234567890abcdef...',
    description: 'User wallet address',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  user_address: string;

  @ApiProperty({
    example: 'I want to swap 100 USDT to APT',
    description: 'The message content from the user',
    minLength: 1,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  content: string;
}

export class PreswapRequestDto {
  // @ApiProperty({
  //   example: '0x1234567890abcdef...',
  //   description: 'User wallet address',
  //   minLength: 1,
  // })
  @IsString()
  @IsNotEmpty()
  user_address: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  fromToken: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  toToken: string;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  fromAmount: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  toAmount: number;

  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  interactiveToken: string;

  @IsEnum(CurveType, {
    message: 'Invalid curve type',
  })
  @IsNotEmpty()
  curveType: CurveType;

  @IsNumber()
  @IsNotEmpty()
  @Min(0)
  version: 0 | 0.5;
}

export class ChatResponseDto {
  @ApiProperty({
    example: 'Action processed successfully',
    description: 'Response message from the chat system',
  })
  message: string;

  @ApiProperty({
    description: 'Extracted DeFi intent from the message',
    type: DeFiIntentSchema,
    required: false,
  })
  intent?: DeFiIntentSchema;

  @ApiProperty({
    example: {
      transactionHash: '0x1234567890abcdef...',
      estimatedGas: '150000',
      slippage: '0.5%',
    },
    description: 'Additional data returned from the action',
    required: false,
  })
  data?: any;
}

export class BridgeRequestDto {
  @IsString()
  @IsNotEmpty()
  tokenA: string;

  @IsString()
  @IsNotEmpty()
  tokenB: string;

  @IsString()
  @IsNotEmpty()
  srcChainKey: string;

  @IsString()
  @IsNotEmpty()
  dstChainKey: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  dstAddress: string;

  @IsString()
  @IsNotEmpty()
  user_address: string;
}
