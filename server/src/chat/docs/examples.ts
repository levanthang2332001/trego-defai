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
      message: 'Action processed successfully',
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
      data: {
        transactionHash: '0x1234567890abcdef...',
        estimatedGas: '150000',
        slippage: '0.5%',
        estimatedOutput: '0.045 ETH',
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
