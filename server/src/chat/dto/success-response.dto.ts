import { ApiProperty } from '@nestjs/swagger';

export class SuccessResponse {
  @ApiProperty({ example: 200, description: 'The HTTP status code' })
  statusCode: number;

  @ApiProperty({ example: 'Success', description: 'The success message' })
  message: string;
}
