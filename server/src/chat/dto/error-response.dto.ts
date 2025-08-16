import { ApiProperty } from '@nestjs/swagger';

export class ErrorResponse {
  @ApiProperty({ example: 400, description: 'The HTTP status code' })
  statusCode: number;

  @ApiProperty({ example: 'Bad Request', description: 'The error message' })
  message: string;
}
