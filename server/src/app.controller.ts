import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service';

@ApiTags('Check health')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHealth(): { status: string; timestamp: string } {
    return this.appService.getHealth();
  }
}
