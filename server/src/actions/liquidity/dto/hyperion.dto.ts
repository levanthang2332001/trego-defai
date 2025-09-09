import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class FetchPoolHyperionRequestDto {
  @ApiProperty({
    example:
      '0x7cfc133399fe16d287580e91dba9d805845885d9a0ba0c6ec4950331f6aa3bf0',
    description: 'Pool id',
  })
  @IsString()
  @IsNotEmpty()
  poolId: string;
}
