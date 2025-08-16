import {
  ApiOperation,
  ApiBody,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { ErrorResponse } from '../dto/error-response.dto';
import { PreswapRequestDto, ChatResponseDto } from '../dto/chat.dto';

export const SwapExamples = {
  requests: {
    preSwap: {
      user_address:
        '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
      fromToken: '0x1::aptos_coin::AptosCoin',
      toToken:
        '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT',
      fromAmount: 1000000, // 0.01 APT (8 decimals)
      toAmount: 100000, // Expected to amount (6 decimals for USDT)
      interactiveToken: 'from',
      curveType: 'stable',
      version: 0,
    },
    swapStable: {
      user_address:
        '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
      fromToken: '0x1::aptos_coin::AptosCoin',
      toToken:
        '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT',
      fromAmount: 1000000, // 0.01 APT
      toAmount: 95000, // Expected to amount with slippage
      interactiveToken: 'from',
      curveType: 'stable',
      version: 0,
    },
    swapUncorrelated: {
      user_address:
        '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
      fromToken: '0x1::aptos_coin::AptosCoin',
      toToken:
        '0x159df6b7689437016108a019fd5bef736bac692b6d4a1f10c941f6fbb9a74ca6::oft::CakeOFT',
      fromAmount: 5000000, // 0.05 APT
      toAmount: 0, // Will be calculated
      interactiveToken: 'from',
      curveType: 'uncorrelated',
      version: 0.5,
    },
  },

  responses: {
    preSwapSuccess: {
      message: 'pre_swap successful',
      data: {
        action: 'PRE_SWAP',
        address:
          '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
        fromToken: '0x1::aptos_coin::AptosCoin',
        toToken:
          '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT',
        fromAmount: 1000000,
        toAmount: 95238, // Calculated rate with current market conditions
        timestamp: '2024-01-15T10:30:00.000Z',
      },
    },
    swapSuccess: {
      message: 'Swap executed successfully',
      data: {
        transactionHash:
          '0x1a2b3c4d5e6f7890abcdef1234567890fedcba0987654321deadbeef12345678',
        toAmount: 94857, // Actual amount received after execution
      },
    },
    preSwapFailure: {
      message:
        'Failed to calculate swap rate: Insufficient liquidity in the pool',
      data: null,
    },
  },

  errors: {
    invalidAddress: {
      statusCode: 400,
      message: 'user_address should not be empty',
    },
    invalidFromToken: {
      statusCode: 400,
      message: 'fromToken should not be empty',
    },
    invalidToToken: {
      statusCode: 400,
      message: 'toToken should not be empty',
    },
    invalidAmount: {
      statusCode: 400,
      message: 'fromAmount must be a positive number',
    },
    invalidCurveType: {
      statusCode: 400,
      message: 'Invalid curve type. Must be either "stable" or "uncorrelated"',
    },
    insufficientBalance: {
      statusCode: 500,
      message: 'Swap failed: Insufficient balance for the swap',
    },
    liquidityError: {
      statusCode: 500,
      message: 'Swap failed: Insufficient liquidity in the pool',
    },
    networkError: {
      statusCode: 500,
      message: 'Swap failed: Network connection failed',
    },
    invalidResponse: {
      statusCode: 500,
      message: 'Swap failed: Invalid response from liquidswap',
    },
  },
};

export const SwapApiDocs = {
  preSwap: {
    operation: ApiOperation({
      summary: 'Calculate swap rate',
      description: `
        Calculate the expected output amount for a token swap without executing the transaction.
        This endpoint is used to preview swap rates and estimate the amount of tokens you'll receive.

        **Supported Features:**
        - Real-time rate calculation using Liquidswap protocol
        - Support for both stable and uncorrelated curve types
        - Slippage tolerance consideration
        - Multi-version protocol support (v0 and v0.5)

        **Token Address Format:**
        Use full Aptos token addresses, for example:
        - APT: \`0x1::aptos_coin::AptosCoin\`
        - USDT: \`0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT\`
      `,
    }),

    body: ApiBody({
      type: PreswapRequestDto,
      description:
        'Pre-swap request parameters including tokens, amounts, and configuration',
      examples: {
        aptToUsdt: {
          summary: 'APT to USDT (Stable Curve)',
          description:
            'Calculate rate for swapping 0.01 APT to USDT using stable curve',
          value: SwapExamples.requests.preSwap,
        },
        aptToCake: {
          summary: 'APT to CAKE (Uncorrelated Curve)',
          description:
            'Calculate rate for swapping 0.05 APT to CAKE using uncorrelated curve',
          value: SwapExamples.requests.swapUncorrelated,
        },
      },
    }),

    okResponse: ApiOkResponse({
      description: 'Swap rate calculated successfully',
      type: ChatResponseDto,
      examples: {
        success: {
          summary: 'Successful rate calculation',
          value: SwapExamples.responses.preSwapSuccess,
        },
      },
    }),

    badRequestResponse: ApiBadRequestResponse({
      description: 'Invalid request parameters',
      type: ErrorResponse,
      examples: {
        invalidAddress: {
          summary: 'Invalid wallet address',
          value: SwapExamples.errors.invalidAddress,
        },
        invalidAmount: {
          summary: 'Invalid amount',
          value: SwapExamples.errors.invalidAmount,
        },
        invalidCurveType: {
          summary: 'Invalid curve type',
          value: SwapExamples.errors.invalidCurveType,
        },
      },
    }),

    internalServerErrorResponse: ApiInternalServerErrorResponse({
      description: 'Internal Server Error',
      type: ErrorResponse,
      examples: {
        liquidityError: {
          summary: 'Insufficient liquidity',
          value: SwapExamples.errors.liquidityError,
        },
        networkError: {
          summary: 'Network connection failed',
          value: SwapExamples.errors.networkError,
        },
      },
    }),
  },

  swap: {
    operation: ApiOperation({
      summary: 'Execute token swap',
      description: `
        Execute a token swap transaction on the Aptos blockchain using Liquidswap protocol.

        **Important Notes:**
        - This endpoint executes actual blockchain transactions
        - Make sure you have sufficient balance for both the swap amount and gas fees
        - The actual output amount may differ slightly from pre-swap calculations due to market movements
        - Transaction fees will be deducted from your wallet

        **Prerequisites:**
        - Valid Aptos wallet with sufficient balance
        - Network connection to Aptos blockchain
        - Sufficient gas for transaction execution

        **Security:**
        - All transactions are signed using your wallet's private key
        - Keys are encrypted and handled securely
        - No private keys are stored on our servers
      `,
    }),

    body: ApiBody({
      type: PreswapRequestDto,
      description:
        'Swap execution parameters including tokens, amounts, and configuration',
      examples: {
        executeSwap: {
          summary: 'Execute APT to USDT swap',
          description: 'Execute a swap of 0.01 APT to USDT with stable curve',
          value: SwapExamples.requests.swapStable,
        },
        executeUncorrelated: {
          summary: 'Execute APT to CAKE swap',
          description:
            'Execute a swap using uncorrelated curve for volatile token pairs',
          value: SwapExamples.requests.swapUncorrelated,
        },
      },
    }),

    okResponse: ApiOkResponse({
      description: 'Swap executed successfully',
      type: ChatResponseDto,
      examples: {
        success: {
          summary: 'Successful swap execution',
          value: SwapExamples.responses.swapSuccess,
        },
      },
    }),

    badRequestResponse: ApiBadRequestResponse({
      description: 'Invalid request parameters',
      type: ErrorResponse,
      examples: {
        invalidTokens: {
          summary: 'Invalid token addresses',
          value: SwapExamples.errors.invalidFromToken,
        },
        invalidAmount: {
          summary: 'Invalid swap amount',
          value: SwapExamples.errors.invalidAmount,
        },
      },
    }),

    internalServerErrorResponse: ApiInternalServerErrorResponse({
      description: 'Swap execution failed',
      type: ErrorResponse,
      examples: {
        insufficientBalance: {
          summary: 'Insufficient balance',
          value: SwapExamples.errors.insufficientBalance,
        },
        invalidResponse: {
          summary: 'Invalid response from protocol',
          value: SwapExamples.errors.invalidResponse,
        },
        networkError: {
          summary: 'Network error during execution',
          value: SwapExamples.errors.networkError,
        },
      },
    }),
  },
};
