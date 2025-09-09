import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealth(): { message: string; timestamp: string } {
    return {
      message: 'Service is running',
      timestamp: new Date().toISOString(),
    };
  }
}
