import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/common/logger.service';
import {
  AMMSwapParams,
  EstimateSwapParams,
  getAllPools,
  getEstSwap,
  // getPoolInfo,
  getRoute,
  swapAMM,
  swapCLMM,
  swapStable,
  validateSwapParams,
} from 'src/tools/tapp-exchange/swap';
import { ChatResponseDto } from '../../../chat/dto';
import {
  PoolInfoRequestDto,
  PreSwapTappExchangeRequestDto,
  RouteRequestDto,
  SwapTappExchangeRequestDto,
} from '../dto/tapp-exchange.dto';

@Injectable()
export class TappExchangeService {
  private readonly logger: LoggerService;

  constructor() {
    this.logger = new LoggerService(TappExchangeService.name);
  }

  async preSwap(
    swapMessage: PreSwapTappExchangeRequestDto,
  ): Promise<ChatResponseDto> {
    try {
      this.logger.log('Starting pre-swap calculation for Tapp Exchange');

      // First, get available routes
      const routes = await getRoute(
        swapMessage.fromToken.tokenAddress,
        swapMessage.toToken.tokenAddress,
      );

      if (!routes || routes.length === 0) {
        return {
          message: 'No trading routes available',
          data: {
            action: 'PRE_SWAP_FAILED',
            error: 'No routes found between these tokens',
          },
        };
      }

      // Use the first available route for estimation
      const route = routes[0];

      // Prepare estimation parameters
      const estimateParams: EstimateSwapParams = {
        poolId: route.poolId,
        a2b: swapMessage.a2b ?? true,
        field: swapMessage.field ?? 'input',
        amount: parseInt(swapMessage.amount),
        pair: [0, 1],
      };

      // Validate parameters
      if (!validateSwapParams(estimateParams)) {
        return {
          message: 'Invalid swap parameters',
          data: {
            action: 'PRE_SWAP_FAILED',
            error: 'Invalid parameters provided',
          },
        };
      }

      // Get swap estimation
      const estimation = await getEstSwap(estimateParams);

      this.logger.log('Pre-swap calculation completed successfully');

      return {
        message: 'Pre-swap calculation successful',
        data: {
          action: 'PRE_SWAP',
          route: {
            poolId: route.poolId,
            tokenA: route.tokenA,
            tokenB: route.tokenB,
            fee: route.fee,
          },
          estimation: {
            amountOut: estimation.amountOut,
            priceImpact: estimation.priceImpact,
            minAmountOut: estimation.minAmountOut,
          },
          fromToken: swapMessage.fromToken,
          toToken: swapMessage.toToken,
          amountIn: swapMessage.amount,
          hasError: !!estimation.error,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
          errorMessage: estimation.error?.message,
        },
      };
    } catch (error) {
      this.logger.error('Pre-swap calculation failed', error as string);
      return {
        message: 'Pre-swap calculation failed',
        data: {
          action: 'PRE_SWAP_FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  executeSwap(
    userAddress: string,
    swapMessage: SwapTappExchangeRequestDto,
  ): ChatResponseDto {
    try {
      this.logger.log(`Executing Tapp Exchange swap for user: ${userAddress}`);

      let transactionPayload: any;

      // Execute different swap types
      switch (swapMessage.swapType) {
        case 'AMM': {
          const ammParams: AMMSwapParams = {
            poolId: swapMessage.poolId,
            a2b: swapMessage.a2b,
            fixedAmountIn: swapMessage.fixedAmountIn ?? true,
            amount0: parseInt(swapMessage.amountIn),
            amount1: parseInt(swapMessage.amountOut),
          };
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          transactionPayload = swapAMM(ammParams);
          break;
        }

        case 'CLMM': {
          const clmmParams = {
            poolId: swapMessage.poolId,
            a2b: swapMessage.a2b,
            byAmountIn: swapMessage.fixedAmountIn ?? true,
            amount: parseInt(swapMessage.amountIn),
            amountLimit: parseInt(swapMessage.amountOut),
            sqrtPriceLimit: swapMessage.sqrtPriceLimit,
          };
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          transactionPayload = swapCLMM(clmmParams);
          break;
        }

        case 'STABLE': {
          const stableParams = {
            poolId: swapMessage.poolId,
            a2b: swapMessage.a2b,
            fixedAmountIn: swapMessage.fixedAmountIn ?? true,
            amount0: parseInt(swapMessage.amountIn),
            amount1: parseInt(swapMessage.amountOut),
          };
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          transactionPayload = swapStable(stableParams);
          break;
        }

        default: {
          const exhaustiveCheck: never = swapMessage.swapType;
          throw new Error(`Unsupported swap type: ${String(exhaustiveCheck)}`);
        }
      }

      this.logger.log('Swap transaction payload created successfully');

      return {
        message: 'Swap transaction prepared successfully',
        data: {
          action: 'SWAP_PREPARED',
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          transactionPayload,
          swapDetails: {
            type: swapMessage.swapType,
            poolId: swapMessage.poolId,
            fromToken: swapMessage.fromToken,
            toToken: swapMessage.toToken,
            amountIn: swapMessage.amountIn,
            amountOut: swapMessage.amountOut,
            slippage: swapMessage.slippage,
            userAddress,
          },
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
          action: 'SWAP_FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async getRoutes(routeRequest: RouteRequestDto): Promise<ChatResponseDto> {
    try {
      this.logger.log('Getting available routes');

      const routes = await getRoute(routeRequest.token0, routeRequest.token1);

      return {
        message: 'Routes retrieved successfully',
        data: {
          action: 'GET_ROUTES',
          routes,
          count: routes.length,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get routes', error as string);
      return {
        message: 'Failed to get routes',
        data: {
          action: 'GET_ROUTES_FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async getPoolInformation(
    poolRequest: PoolInfoRequestDto,
  ): Promise<ChatResponseDto> {
    try {
      this.logger.log(`Getting pool information for: ${poolRequest.poolId}`);

      // const poolInfo = await getPoolInfo(poolRequest.poolId);

      return {
        message: 'Pool information retrieved successfully',
        data: {
          action: 'GET_POOL_INFO',
          // poolInfo,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get pool information', error as string);
      return {
        message: 'Failed to get pool information',
        data: {
          action: 'GET_POOL_INFO_FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  async getAllPoolInformation(): Promise<ChatResponseDto> {
    try {
      this.logger.log('Getting all pool information');

      const pools = await getAllPools();

      return {
        message: 'All pools information retrieved successfully',
        data: {
          action: 'GET_ALL_POOLS',
          pools,
          count: pools.length,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get all pools information', error as string);
      return {
        message: 'Failed to get all pools information',
        data: {
          action: 'GET_ALL_POOLS_FAILED',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }
}
