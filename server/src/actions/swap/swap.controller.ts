import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatResponseDto } from 'src/chat/dto';
import { HyperionApiDocs } from './docs/hyperion.docs';
import { PanoraApiDocs } from './docs/panora.docs';
import {
  PreSwapHyperionRequestDto,
  SwapHyperionRequestDto,
} from './dto/hyperion.dto';
import {
  PreSwapPanoramicRequestDto,
  SwapPanoramicRequestDto,
} from './dto/panora.dto';
import { HyperionService } from './services/hyperion.service';
import { PanoraService } from './services/panora.service';

@ApiTags('Token Swap')
@Controller('swap')
export class SwapController {
  constructor(
    private readonly hyperionService: HyperionService,
    private readonly panoraService: PanoraService,
  ) {}

  @Post('panoramic/pre-swap')
  // @UseGuards(JwtAuthGuard)
  @PanoraApiDocs.preSwap.operation
  @PanoraApiDocs.preSwap.body
  @PanoraApiDocs.preSwap.okResponse
  @PanoraApiDocs.preSwap.badRequestResponse
  async preSwapPanoramic(
    @Body() swapMessage: PreSwapPanoramicRequestDto,
  ): Promise<ChatResponseDto> {
    return this.panoraService.preSwap(swapMessage);
  }

  @Post('panoramic/swap')
  @PanoraApiDocs.swap.operation
  @PanoraApiDocs.swap.body
  @PanoraApiDocs.swap.okResponse
  async swapPanoramic(
    @Body() swapMessage: SwapPanoramicRequestDto,
  ): Promise<ChatResponseDto> {
    return this.panoraService.executeSwap(swapMessage);
  }

  @Post('hyperion/pre-swap')
  @HyperionApiDocs.preSwap.operation
  @HyperionApiDocs.preSwap.body
  @HyperionApiDocs.preSwap.okResponse
  @HyperionApiDocs.preSwap.badRequestResponse
  async preSwapHyperion(
    @Body() swapMessage: PreSwapHyperionRequestDto,
  ): Promise<ChatResponseDto> {
    return this.hyperionService.preSwap(swapMessage);
  }

  @Post('hyperion/swap')
  @HyperionApiDocs.swap.operation
  @HyperionApiDocs.swap.body
  @HyperionApiDocs.swap.okResponse
  async swapHyperion(
    @Body() userAddress: string,
    @Body() swapMessage: SwapHyperionRequestDto,
  ): Promise<ChatResponseDto> {
    return this.hyperionService.executeSwap(userAddress, swapMessage);
  }
}
