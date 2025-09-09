import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

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

export class ChatResponseDto {
  @ApiProperty({
    example: 'Action processed successfully',
    description: 'Response message from the chat system',
  })
  message: string;

  @ApiProperty({
    description: 'Extracted DeFi intent from the message',
    required: false,
  })
  intent?: any;

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
