import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/common/logger.service';
import HyperionRouter from 'src/tools/hyperion';
import { ChatResponseDto } from '../../../chat/dto';
import { FetchPoolHyperionRequestDto } from '../dto/hyperion.dto';

@Injectable()
export class HyperionService {
  private readonly logger: LoggerService;

  constructor() {
    this.logger = new LoggerService(HyperionService.name);
  }

  async fetchAllPools(): Promise<ChatResponseDto> {
    try {
      const result = await HyperionRouter.fetchAllPools();

      return {
        message: 'Fetch all pools successful',
        data: {
          action: 'FETCH_ALL_POOLS',
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

  async fetchOnePool(
    data: FetchPoolHyperionRequestDto,
  ): Promise<ChatResponseDto> {
    try {
      const result = await HyperionRouter.fetchOnePool(data.poolId);

      return {
        message: 'Fetch one pool successful',
        data: {
          action: 'FETCH_ONE_POOL',
          result,
        },
      };
    } catch (error) {
      this.logger.error('Fetch one pool failed', error as string);
      return {
        message: 'Fetch one pool failed',
        data: {
          error:
            error instanceof Error ? JSON.stringify(error) : 'Unknown error',
        },
      };
    }
  }
}
