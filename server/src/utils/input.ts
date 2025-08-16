import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class GenerateWalletDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{64}$/, { message: 'Invalid address format' })
  address: string;
}
