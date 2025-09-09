import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsOptional,
  ValidateNested,
  Allow,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class StargateStepDto {
  @ApiProperty({ example: 'bridge' })
  @IsString()
  @IsNotEmpty()
  type: string;

  @ApiProperty({
    example:
      '0x1c6909212b92841e1bbe34ea2018dfd68dc364b09ef912f4dd063f17e2239cdb',
  })
  @IsString()
  @IsNotEmpty()
  sender: string;

  @ApiProperty({ example: 'aptos' })
  @IsString()
  @IsNotEmpty()
  chainKey: string;

  @ApiProperty({
    example: {
      type: 'simple',
      encoding: 'hex',
      data: '0x1c6909212b92841e1bbe34ea2018dfd68dc364b09ef912f4dd063f17e2239cdbbe...',
    },
  })
  @Allow()
  transaction: any;
}

export class StargateFeeDto {
  @ApiProperty({ example: '0x1::aptos_coin::AptosCoin' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'aptos' })
  @IsString()
  @IsNotEmpty()
  chainKey: string;

  @ApiProperty({ example: '790482' })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ example: 'message' })
  @IsString()
  @IsNotEmpty()
  type: string;
}

export class StargateQuoteDto {
  @ApiProperty({
    example:
      '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
  })
  @IsString()
  @IsNotEmpty()
  srcToken: string;

  @ApiProperty({ example: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d' })
  @IsString()
  @IsNotEmpty()
  dstToken: string;

  @ApiProperty({
    example:
      '0x1c6909212b92841e1bbe34ea2018dfd68dc364b09ef912f4dd063f17e2239cdb',
  })
  @IsString()
  @IsNotEmpty()
  srcAddress: string;

  @ApiProperty({ example: '0x5894FC5d4225aFe25F2e04a77C8cd04fD57dDfCF' })
  @IsString()
  @IsNotEmpty()
  dstAddress: string;

  @ApiProperty({ example: 'aptos' })
  @IsString()
  @IsNotEmpty()
  srcChainKey: string;

  @ApiProperty({ example: 'bsc' })
  @IsString()
  @IsNotEmpty()
  dstChainKey: string;

  @ApiProperty({ example: '1000000' })
  @IsString()
  @IsNotEmpty()
  srcAmount: string;

  @ApiProperty({ example: '1000000' })
  @IsString()
  @IsNotEmpty()
  dstAmountMin: string;

  // Allow additional properties from complex quote
  @ApiProperty({ required: false })
  @IsOptional()
  @Allow()
  route?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Allow()
  error?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @Allow()
  dstAmount?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Allow()
  srcAmountMax?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Allow()
  dstNativeAmount?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Allow()
  duration?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @Allow()
  fees?: any[];

  @ApiProperty({ type: [StargateFeeDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StargateFeeDto)
  fee?: StargateFeeDto[];

  @ApiProperty({ type: [StargateStepDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StargateStepDto)
  steps?: StargateStepDto[];
}

export class BridgeStargateRequestDto {
  @ApiProperty({ type: StargateQuoteDto })
  @ValidateNested()
  @Type(() => StargateQuoteDto)
  quote: StargateQuoteDto;

  @ApiProperty({
    example:
      '0x1c6909212b92841e1bbe34ea2018dfd68dc364b09ef912f4dd063f17e2239cdb',
  })
  @IsString()
  @IsNotEmpty()
  user_address: string;
}
