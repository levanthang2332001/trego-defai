import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import {
  PoolInfoRequestDto,
  PreSwapTappExchangeRequestDto,
  RouteRequestDto,
  SwapTappExchangeRequestDto,
} from '../dto/tapp-exchange.dto';

export const TappExchangeApiDocs = {
  preSwap: {
    operation: ApiOperation({
      tags: ['Tapp Exchange Protocol'],
      summary: 'Get pre-swap calculation for Tapp Exchange',
      description: `
        Calculate swap details before executing the actual swap on Tapp Exchange.
        This endpoint provides:
        - Available trading routes
        - Estimated output amounts
        - Price impact analysis
        - Minimum output with slippage protection

        The pre-swap calculation helps users understand the trade before execution.
      `,
    }),
    body: ApiBody({
      type: PreSwapTappExchangeRequestDto,
      description: 'Pre-swap request parameters',
      examples: {
        'APT to USDC': {
          summary: 'Swap APT to USDC',
          value: {
            fromToken: {
              tokenAddress: '0x1::aptos_coin::AptosCoin',
              faAddress: '0xa',
              name: 'Aptos Coin',
              symbol: 'APT',
              decimals: 8,
            },
            toToken: {
              tokenAddress:
                '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
              faAddress: '0xb',
              name: 'USD Coin',
              symbol: 'USDC',
              decimals: 6,
            },
            amount: '100000000',
            a2b: true,
            field: 'input',
          },
        },
      },
    }),
    responses: {
      success: ApiResponse({
        status: 200,
        description: 'Pre-swap calculation successful',
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Pre-swap calculation successful',
            },
            data: {
              type: 'object',
              properties: {
                action: { type: 'string', example: 'PRE_SWAP' },
                route: {
                  type: 'object',
                  properties: {
                    poolId: { type: 'string' },
                    tokenA: { type: 'string' },
                    tokenB: { type: 'string' },
                    fee: { type: 'number' },
                  },
                },
                estimation: {
                  type: 'object',
                  properties: {
                    amountOut: { type: 'number' },
                    priceImpact: { type: 'number' },
                    minAmountOut: { type: 'number' },
                  },
                },
                fromToken: { type: 'object' },
                toToken: { type: 'object' },
                amountIn: { type: 'string' },
                hasError: { type: 'boolean' },
                errorMessage: { type: 'string' },
              },
            },
          },
        },
      }),
      error: ApiResponse({
        status: 400,
        description: 'Pre-swap calculation failed',
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Pre-swap calculation failed' },
            data: {
              type: 'object',
              properties: {
                action: { type: 'string', example: 'PRE_SWAP_FAILED' },
                error: { type: 'string' },
              },
            },
          },
        },
      }),
    },
  },

  executeSwap: {
    operation: ApiOperation({
      tags: ['Tapp Exchange Protocol'],
      summary: 'Execute swap on Tapp Exchange',
      description: `
        Execute a swap transaction on Tapp Exchange. This endpoint supports:
        - AMM (Automated Market Maker) swaps
        - CLMM (Concentrated Liquidity Market Maker) swaps
        - Stable swaps for like-kind assets

        The endpoint returns a transaction payload that needs to be signed and submitted.
      `,
    }),
    body: ApiBody({
      type: SwapTappExchangeRequestDto,
      description: 'Swap execution parameters',
      examples: {
        'AMM Swap': {
          summary: 'AMM swap APT to USDC',
          value: {
            fromToken: {
              tokenAddress: '0x1::aptos_coin::AptosCoin',
              faAddress: '0xa',
              name: 'Aptos Coin',
              symbol: 'APT',
              decimals: 8,
            },
            toToken: {
              tokenAddress:
                '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
              faAddress: '0xb',
              name: 'USD Coin',
              symbol: 'USDC',
              decimals: 6,
            },
            amountIn: '100000000',
            amountOut: '95000000',
            poolId: '0x1234567890abcdef...',
            a2b: true,
            slippage: 0.5,
            swapType: 'AMM',
            fixedAmountIn: true,
          },
        },
        'CLMM Swap': {
          summary: 'CLMM swap with price limit',
          value: {
            fromToken: {
              tokenAddress: '0x1::aptos_coin::AptosCoin',
              faAddress: '0xa',
              name: 'Aptos Coin',
              symbol: 'APT',
              decimals: 8,
            },
            toToken: {
              tokenAddress:
                '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDC',
              faAddress: '0xb',
              name: 'USD Coin',
              symbol: 'USDC',
              decimals: 6,
            },
            amountIn: '100000000',
            amountOut: '95000000',
            poolId: '0x1234567890abcdef...',
            a2b: true,
            slippage: 0.5,
            swapType: 'CLMM',
            fixedAmountIn: true,
            sqrtPriceLimit: '1000000000000',
          },
        },
      },
    }),
    responses: {
      success: ApiResponse({
        status: 200,
        description: 'Swap transaction prepared successfully',
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Swap transaction prepared successfully',
            },
            data: {
              type: 'object',
              properties: {
                action: { type: 'string', example: 'SWAP_PREPARED' },
                transactionPayload: { type: 'object' },
                swapDetails: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    poolId: { type: 'string' },
                    fromToken: { type: 'object' },
                    toToken: { type: 'object' },
                    amountIn: { type: 'string' },
                    amountOut: { type: 'string' },
                    slippage: { type: 'number' },
                    userAddress: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      }),
      error: ApiResponse({
        status: 400,
        description: 'Swap execution failed',
        schema: {
          type: 'object',
          properties: {
            message: { type: 'string', example: 'Swap execution failed' },
            data: {
              type: 'object',
              properties: {
                action: { type: 'string', example: 'SWAP_FAILED' },
                error: { type: 'string' },
              },
            },
          },
        },
      }),
    },
  },

  getRoutes: {
    operation: ApiOperation({
      tags: ['Tapp Exchange Protocol'],
      summary: 'Get available trading routes',
      description:
        'Get all available trading routes between two tokens on Tapp Exchange.',
    }),
    body: ApiBody({
      type: RouteRequestDto,
      description: 'Route request parameters',
    }),
    responses: {
      success: ApiResponse({
        status: 200,
        description: 'Routes retrieved successfully',
      }),
    },
  },

  getPoolInfo: {
    operation: ApiOperation({
      tags: ['Tapp Exchange Protocol'],
      summary: 'Get pool information',
      description:
        'Get detailed information about a specific pool on Tapp Exchange.',
    }),
    body: ApiBody({
      type: PoolInfoRequestDto,
      description: 'Pool information request parameters',
    }),
    responses: {
      success: ApiResponse({
        status: 200,
        description: 'Pool information retrieved successfully',
      }),
    },
  },

  getAllPools: {
    operation: ApiOperation({
      tags: ['Tapp Exchange Protocol'],
      summary: 'Get all pools information',
      description:
        'Get information about all available pools on Tapp Exchange.',
    }),
    responses: {
      success: ApiResponse({
        status: 200,
        description: 'All pools information retrieved successfully',
      }),
    },
  },
};
