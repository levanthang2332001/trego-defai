import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/common/logger.service';
import HyperionRouter from 'src/tools/hyperion';
import { ChatResponseDto } from '../../../chat/dto';
import {
  PreSwapHyperionRequestDto,
  SwapHyperionRequestDto,
} from '../dto/hyperion.dto';

@Injectable()
export class HyperionService {
  private readonly logger: LoggerService;

  constructor() {
    this.logger = new LoggerService(HyperionService.name);
  }

  async preSwap(
    swapMessage: PreSwapHyperionRequestDto,
  ): Promise<ChatResponseDto> {
    try {
      const result = await HyperionRouter.preSwap(swapMessage);

      return {
        message: 'Pre-swap calculation successful',
        data: {
          action: 'PRE_SWAP',
          result,
        },
      };
    } catch (error) {
      this.logger.error('Pre-swap calculation failed', error as string);
      return {
        message: 'Pre-swap calculation failed',
        data: {
          error:
            error instanceof Error ? JSON.stringify(error) : 'Unknown error',
        },
      };
    }
  }

  async executeSwap(
    userAddress: string,
    swapMessage: SwapHyperionRequestDto,
  ): Promise<ChatResponseDto> {
    try {
      const result = await HyperionRouter.swap({
        userAddress,
        swapMessage,
      });

      // Check if the result contains an error
      if (result && typeof result === 'object' && 'error' in result) {
        throw new Error(result.error);
      }

      return {
        message: 'Swap executed successfully',
        data: {
          result,
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
