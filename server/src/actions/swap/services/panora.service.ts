import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/common/logger.service';
import { PanoraRouter } from 'src/tools/panora/swap';
import { ChatResponseDto } from '../../../chat/dto';
import {
  PreSwapPanoramicRequestDto,
  SwapPanoramicRequestDto,
} from '../dto/panora.dto';

@Injectable()
export class PanoraService {
  private readonly logger: LoggerService;

  constructor() {
    this.logger = new LoggerService(PanoraService.name);
  }

  async preSwap(
    swapMessage: PreSwapPanoramicRequestDto,
  ): Promise<ChatResponseDto> {
    try {
      const result = await PanoraRouter.preSwapQuote(swapMessage);

      console.log('result: ', result);

      return {
        message: 'Pre-swap calculation successful',
        data: {
          action: 'PRE_SWAP',
          fromTokenAmountUSD:
            ('fromTokenAmountUSD' in result
              ? result.fromTokenAmountUSD
              : undefined) || 'N/A',
          toTokenAmount:
            ('toTokenAmountUSD' in result.quotes[0]
              ? result.quotes[0].toTokenAmountUSD
              : undefined) || 'N/A',
          feeTokenAmountUSD:
            ('feeTokenAmountUSD' in result.quotes[0]
              ? result.quotes[0].feeTokenAmountUSD
              : undefined) || 'N/A',
        },
      };
    } catch (error) {
      return {
        message: 'Pre-swap calculation failed',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async executeSwap(
    swapMessage: SwapPanoramicRequestDto,
  ): Promise<ChatResponseDto> {
    try {
      const result = await PanoraRouter.exactSwap(swapMessage);
      return {
        message: 'Swap executed successfully',
        data: {
          result,
          transactionHash: result.hash,
        },
      };
    } catch (error) {
      this.logger.error(
        'Swap execution failed',
        error instanceof Error ? error.message : String(error),
      );
      return {
        message: 'Swap execution failed',
        data: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
