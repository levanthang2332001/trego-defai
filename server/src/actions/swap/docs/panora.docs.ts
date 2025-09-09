import {
  ApiBadRequestResponse,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { ChatResponseDto, ErrorResponse } from 'src/chat/dto';
import { PreSwapPanoramicRequestDto } from '../dto/panora.dto';
import { SwapPanoramicRequestDto } from '../dto/panora.dto';

export const PanoraApiDocs = {
  preSwap: {
    operation: ApiOperation({
      tags: ['Panora protocol'],
      summary: 'Calculate swap rate using Panoramic',
    }),

    body: ApiBody({
      type: PreSwapPanoramicRequestDto,
      examples: {
        aptToUsdt: {
          summary: 'APT to USDT',
          description: 'Calculate rate for swapping 0.01 APT to USDT ',
          value: {
            chainId: '1',
            fromTokenAddress: '0x1::aptos_coin::AptosCoin',
            toTokenAddress:
              '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
            fromTokenAmount: '5000000000',
            toWalletAddress: '0x123456789abcdef',
            slippagePercentage: '0.5',
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
              fromTokenAmountUSD: '4236796700',
              toTokenAmount: '3397621.70389263',
              feeTokenAmountUSD: '0',
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
      tags: ['Panora protocol'],
      summary: 'Execute token swap',
    }),
    body: ApiBody({
      type: SwapPanoramicRequestDto,
      description: 'Swap parameters',
      examples: {
        executeSwap: {
          summary: 'Execute APT to USDT swap',
          description: 'Execute a swap of 0.01 APT to USDT',
          value: {
            params: {
              chainId: '1',
              fromTokenAddress: '0x1::aptos_coin::AptosCoin',
              toTokenAddress:
                '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
              fromTokenAmount: '1000000000',
              toWalletAddress: '0x123456789abcdef',
              slippagePercentage: '0.5',
            },
            privateKey:
              '0x123456789abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
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
