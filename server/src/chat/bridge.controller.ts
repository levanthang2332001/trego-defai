import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  BridgeRequestDto,
  ChatResponseDto,
  BridgeStargateRequestDto,
} from './dto';
import { BridgeService } from './services/bridge.service';
import { JwtAuthGuard } from 'src/wallet/guard/jwt-auth.guard';

@ApiTags('Bridge')
@Controller('bridge')
export class BridgeController {
  constructor(private readonly bridgeService: BridgeService) {}

  @Post('quote')
  @UseGuards(JwtAuthGuard)
  async quoteBridge(
    @Body() bridgeMessage: BridgeRequestDto,
  ): Promise<ChatResponseDto> {
    return this.bridgeService.quoteBridge(bridgeMessage);
  }

  @Post('stargate-quote')
  @UseGuards(JwtAuthGuard)
  async stargateQuote(
    @Body() stargateMessage: BridgeStargateRequestDto,
  ): Promise<ChatResponseDto> {
    return this.bridgeService.executeBridge(stargateMessage);
  }
}
