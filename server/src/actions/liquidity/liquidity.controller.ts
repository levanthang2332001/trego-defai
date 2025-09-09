import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatResponseDto } from 'src/chat/dto';
import { HyperionApiDocs } from './docs/hyperion.docs';
import { FetchPoolHyperionRequestDto } from './dto/hyperion.dto';
import { HyperionService } from './services/hyperion.service';

@ApiTags('Token Liquidity')
@Controller('liquidity')
export class LiquidityController {
  constructor(private readonly hyperionService: HyperionService) {}

  @Get('hyperion/get-pools')
  @HyperionApiDocs.fetchAllPools.operation
  @HyperionApiDocs.fetchAllPools.okResponse
  @HyperionApiDocs.fetchAllPools.badRequestResponse
  async fetchAllPools(): Promise<ChatResponseDto> {
    return this.hyperionService.fetchAllPools();
  }

  @Post('hyperion/get-pool')
  @HyperionApiDocs.fetchOnePool.operation
  @HyperionApiDocs.fetchOnePool.okResponse
  @HyperionApiDocs.fetchOnePool.badRequestResponse
  async fetchOnePool(
    @Body() data: FetchPoolHyperionRequestDto,
  ): Promise<ChatResponseDto> {
    return this.hyperionService.fetchOnePool(data);
  }
}
