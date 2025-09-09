export const ChatExamples = {
  requests: {
    swap: {
      user_address:
        '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
      content: 'I want to swap 0.0001 APT to USDT',
    },
    liquidity: {
      user_address:
        '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
      content: 'Add 0.0001 APT and 0.0001 APT to liquidity pool',
    },
    staking: {
      user_address:
        '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
      content: 'Stake 0.0001 APT for 30 days',
    },
    unstaking: {
      user_address:
        '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
      content: 'Unstake 0.0001 APT',
    },
    unclear: {
      user_address:
        '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
      content: 'Hello, how are you?',
    },
  },

  responses: {
    swapSuccess: {
      message:
        '<h2 class="text-lg font-semibold mb-2">Swap Quotes Ready! 💱</h2>\n          <div class="space-y-3">\n            \n            <div class="bg-gray-50 p-4 rounded-lg">\n              <div class="flex justify-between items-center mb-2">\n                <span class="font-medium">From: APT</span>\n                <span class="text-lg font-bold">10000</span>\n              </div>\n              <div class="flex justify-between items-center">\n                <span class="font-medium">To: USDT</span>\n                <span class="text-lg font-bold text-green-600">3590</span>\n              </div>\n              <div class="flex justify-between text-sm text-gray-600 mt-2">\n                <span>Value: $0.00 → $0.00</span>\n                <span>Provider: HYPERION</span>\n              </div>\n              <div class="text-sm text-gray-500">Slippage: 0.5%</div>\n            </div>\n            <div class="bg-gray-50 p-4 rounded-lg">\n              <div class="flex justify-between items-center mb-2">\n                <span class="font-medium">From: APT</span>\n                <span class="text-lg font-bold">0.0001</span>\n              </div>\n              <div class="flex justify-between items-center">\n                <span class="font-medium">To: USDT</span>\n                <span class="text-lg font-bold text-green-600">0.000434</span>\n              </div>\n              <div class="flex justify-between text-sm text-gray-600 mt-2">\n                <span>Value: $0.00 → $0.00</span>\n                <span>Provider: PANORA</span>\n              </div>\n              <div class="text-sm text-gray-500">Slippage: 0.5%</div>\n            </div>\n          </div>\n          <div class="mt-4 text-sm">\n            Best by output: <span class="font-semibold">HYPERION</span> (3590)\n          </div>',
      success: true,
      data: [
        {
          provider: 'hyperion',
          fromToken: 'APT',
          toToken: 'USDT',
          fromAmount: '10000',
          toAmount: '3590',
          fromAmountUsd: 0.0001,
          toAmountUsd: 0.00359,
          slippage: 0.5,
          path: [
            '0x692ba87730279862aa1a93b5fef9a175ea0cccc1f29dfc84d3ec7fbe1561aef3',
            '0x7a4a0f042d6198677f7ca5d169c1d9b882c0e4e3fbfa64408b34852304048b22',
          ],
          timestamp: '2025-09-04T09:48:25.348Z',
        },
        {
          provider: 'panora',
          fromToken: 'APT',
          toToken: 'USDT',
          fromAmount: '0.0001',
          toAmount: '0.000434',
          fromAmountUsd: 0.00042848,
          toAmountUsd: 0.0004341,
          slippage: 0.5,
          path: [],
          timestamp: '2025-09-04T09:48:25.348Z',
        },
      ],
      intent: {
        actionType: 'swap',
        params: {
          fromToken: 'USDT',
          toToken: 'ETH',
          amount: 100,
        },
        confidence: 0.95,
        missingFields: [],
        context: 'User wants to swap USDT for ETH',
      },
    },
    liquiditySuccess: {
      message: 'Action processed successfully',
      intent: {
        actionType: 'liquidity',
        params: {
          tokenA: 'USDT',
          tokenB: 'ETH',
          amountA: 1000,
          amountB: 0.5,
        },
        confidence: 0.92,
        missingFields: [],
        context: 'User wants to add liquidity to USDT-ETH pool',
      },
      data: {
        poolAddress: '0xabcdef123456...',
        lpTokens: '50.25',
        estimatedGas: '200000',
      },
    },
    stakingSuccess: {
      message: 'Action processed successfully',
      intent: {
        actionType: 'staking',
        params: {
          token: 'USDT',
          amount: 500,
          duration: 30,
        },
        confidence: 0.88,
        missingFields: [],
        context: 'User wants to stake USDT for 30 days',
      },
      data: {
        stakingContract: '0xdef456789abc...',
        estimatedRewards: '25 USDT',
        lockPeriod: '30 days',
      },
    },
    unstakingSuccess: {
      message: 'Action processed successfully',
      intent: {
        actionType: 'unstaking',
        params: {
          token: 'USDT',
          amount: 500,
          duration: 30,
        },
        confidence: 0.88,
        missingFields: [],
        context: 'User wants to unstake USDT for 30 days',
      },
      data: {
        unstakingContract: '0xdef456789abc...',
        estimatedRewards: '25 USDT',
        lockPeriod: '30 days',
      },
    },
    unclearIntent: {
      message:
        "I couldn't understand your request. Please try again with more details.",
      intent: undefined,
      data: undefined,
    },
  },

  errors: {
    invalidTasmilAddress: {
      statusCode: 400,
      message: 'user_address should not be empty',
    },
    invalidContent: {
      statusCode: 400,
      message: 'content should not be empty',
    },
    serverError: {
      statusCode: 500,
      message: 'Sorry, I encountered an error: Intent extraction failed',
    },
  },
};
