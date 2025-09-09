import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatResponseDto } from 'src/chat/dto';
import { HyperionApiDocs } from './docs/hyperion.docs';
import { PanoraApiDocs } from './docs/panora.docs';
import { TappExchangeApiDocs } from './docs/tapp-exchange.docs';
import {
  PreSwapHyperionRequestDto,
  SwapHyperionRequestDto,
} from './dto/hyperion.dto';
import {
  PreSwapPanoramicRequestDto,
  SwapPanoramicRequestDto,
} from './dto/panora.dto';
import {
  PoolInfoRequestDto,
  PreSwapTappExchangeRequestDto,
  RouteRequestDto,
  SwapTappExchangeRequestDto,
} from './dto/tapp-exchange.dto';
import { HyperionService } from './services/hyperion.service';
import { PanoraService } from './services/panora.service';
import { TappExchangeService } from './services/tapp-exchange.service';

@ApiTags('Token Swap')
@Controller('/')
export class SwapController {
  constructor(
    private readonly hyperionService: HyperionService,
    private readonly panoraService: PanoraService,
    private readonly tappExchangeService: TappExchangeService,
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

  @Post('tapp-exchange/pre-swap')
  @TappExchangeApiDocs.preSwap.operation
  @TappExchangeApiDocs.preSwap.body
  @TappExchangeApiDocs.preSwap.responses.success
  @TappExchangeApiDocs.preSwap.responses.error
  async preSwapTappExchange(
    @Body() swapMessage: PreSwapTappExchangeRequestDto,
  ): Promise<ChatResponseDto> {
    return this.tappExchangeService.preSwap(swapMessage);
  }

  @Post('tapp-exchange/swap')
  @TappExchangeApiDocs.executeSwap.operation
  @TappExchangeApiDocs.executeSwap.body
  @TappExchangeApiDocs.executeSwap.responses.success
  @TappExchangeApiDocs.executeSwap.responses.error
  swapTappExchange(
    @Body()
    request: {
      userAddress: string;
      swapMessage: SwapTappExchangeRequestDto;
    },
  ): ChatResponseDto {
    return this.tappExchangeService.executeSwap(
      request.userAddress,
      request.swapMessage,
    );
  }

  @Post('tapp-exchange/routes')
  @TappExchangeApiDocs.getRoutes.operation
  @TappExchangeApiDocs.getRoutes.body
  @TappExchangeApiDocs.getRoutes.responses.success
  async getTappExchangeRoutes(
    @Body() routeRequest: RouteRequestDto,
  ): Promise<ChatResponseDto> {
    return this.tappExchangeService.getRoutes(routeRequest);
  }

  @Post('tapp-exchange/pool-info')
  @TappExchangeApiDocs.getPoolInfo.operation
  @TappExchangeApiDocs.getPoolInfo.body
  @TappExchangeApiDocs.getPoolInfo.responses.success
  async getTappExchangePoolInfo(
    @Body() poolRequest: PoolInfoRequestDto,
  ): Promise<ChatResponseDto> {
    return this.tappExchangeService.getPoolInformation(poolRequest);
  }

  @Post('tapp-exchange/all-pools')
  @TappExchangeApiDocs.getAllPools.operation
  @TappExchangeApiDocs.getAllPools.responses.success
  async getAllTappExchangePools(): Promise<ChatResponseDto> {
    return this.tappExchangeService.getAllPoolInformation();
  }
}
