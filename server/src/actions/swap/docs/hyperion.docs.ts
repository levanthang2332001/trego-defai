import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ChatResponseDto, ErrorResponse } from 'src/chat/dto';
import {
  PreSwapHyperionRequestDto,
  SwapHyperionRequestDto,
} from '../dto/hyperion.dto';

export const HyperionApiDocs = {
  preSwap: {
    operation: ApiOperation({
      tags: ['Hyperion protocol'],
      summary: 'Calculate swap rate using Hyperion',
    }),

    body: ApiBody({
      type: PreSwapHyperionRequestDto,
      examples: {
        aptToUsdt: {
          summary: 'APT to USDT',
          description: 'Calculate rate for swapping 0.01 APT to USDT ',
          value: {
            amount: '0.01',
            fromToken: {
              tokenAddress: '0x1::aptos_coin::AptosCoin',
              faAddress: '0xa',
              name: 'Aptos Coin',
              symbol: 'APT',
              decimals: 8,
            },
            toToken: {
              tokenAddress:
                '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
              faAddress:
                '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
              name: 'USDT',
              symbol: 'USDT',
              decimals: 6,
            },
          },
        },
      },
    }),

    okResponse: ApiOkResponse({
      description: 'Swap rate calculated successfully',
      type: ChatResponseDto,
      examples: {
        success: {
          summary: 'Successful pre-swap calculation',
          value: {
            message: 'Pre-swap calculation successful',
            data: {
              action: 'PRE_SWAP',
              result: {
                amountOut: '50321',
                amountIn: '1000000',
                path: [
                  '0x39bbbd6bb19d932e255f1960a4c61b05a1f6aaef43e9d0c479dcb400c1d5951e',
                  '0xd3894aca06d5f42b27c89e6f448114b3ed6a1ba07f992a58b2126c71dd83c127',
                ],
                amountInUsd: 0.01,
                amountOutUsd: 0.050321,
              },
            },
          },
        },
      },
    }),

    badRequestResponse: ApiBadRequestResponse({
      description: 'Invalid request parameters',
      type: ErrorResponse,
      examples: {
        invalidTokens: {
          summary: 'Invalid token addresses',
          value: {
            message: 'Invalid token addresses',
            data: null,
          },
        },
      },
    }),
  },

  swap: {
    operation: ApiOperation({
      tags: ['Hyperion protocol'],
      summary: 'Execute token swap',
    }),
    body: ApiBody({
      type: SwapHyperionRequestDto,
      description: 'Swap parameters',
      examples: {
        executeSwap: {
          summary: 'Execute APT to USDT swap',
          description: 'Execute a swap of 0.01 APT to USDT',
          value: {
            userAddress:
              '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
            fromToken: {
              tokenAddress: '0x1::aptos_coin::AptosCoin',
              faAddress: '0xa',
              name: 'Aptos Coin',
              symbol: 'APT',
              decimals: 8,
            },
            toToken: {
              tokenAddress:
                '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
              faAddress:
                '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
              name: 'USDT',
              symbol: 'USDT',
              decimals: 6,
            },
            amountOut: '50321',
            amountIn: '1000000',
            path: [
              '0x39bbbd6bb19d932e255f1960a4c61b05a1f6aaef43e9d0c479dcb400c1d5951e',
              '0xd3894aca06d5f42b27c89e6f448114b3ed6a1ba07f992a58b2126c71dd83c127',
            ],
            slippage: 0.8,
            recipient:
              '0x1c6909212b92841e1bbe34ea2018dfd68dc364b09ef912f4dd063f17e2239cdb',
          },
        },
      },
    }),
    okResponse: ApiOkResponse({
      description: 'Swap executed successfully',
      type: ChatResponseDto,
      examples: {
        success: {
          summary: 'Successful swap execution',
          value: {
            message: 'pre_swap successful',
            data: {
              action: 'PRE_SWAP',
              address:
                '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
              fromToken: '0x1::aptos_coin::AptosCoin',
              toToken:
                '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT',
              fromAmount: 1000000,
              toAmount: 95238,
              timestamp: '2024-01-15T10:30:00.000Z',
            },
          },
        },
      },
    }),
    badRequestResponse: ApiBadRequestResponse({
      description: 'Invalid request parameters',
      type: ErrorResponse,
      examples: {
        invalidPrivateKey: {
          summary: 'Invalid token addresses',
          value: {
            message: 'Swap execution failed',
            data: {
              error: 'Hex string must be an even number of hex characters.',
            },
          },
        },
      },
    }),
  },
};
