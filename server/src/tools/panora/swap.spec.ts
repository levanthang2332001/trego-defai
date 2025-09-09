/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-require-imports */
import { getTokenAddress, getTokenInfo, PanoraRouter } from './swap';
import { TokenMapping } from './token-mapping';

// Mock the Panora SDK
jest.mock('@panoraexchange/swap-sdk', () => {
  const mockPanora = {
    SwapQuote: jest.fn(),
    Swap: jest.fn(),
  };

  return function PanoraConstructor() {
    return mockPanora;
  };
});

describe('Panora Swap Functions', () => {
  let mockPanora: {
    SwapQuote: jest.MockedFunction<any>;
    Swap: jest.MockedFunction<any>;
  };

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Get reference to mocked Panora instance
    const Panora =
      require('@panoraexchange/swap-sdk') as new () => typeof mockPanora;
    mockPanora = new Panora();
  });

  describe('Token Info Functions', () => {
    it('should find token info by symbol', () => {
      const tokenInfo = getTokenInfo('APT');
      expect(tokenInfo.symbol).toBe('APT');
      expect(tokenInfo.name).toBe('Aptos Coin');
      expect(tokenInfo.decimals).toBe(8);
    });

    it('should find token info by name', () => {
      const tokenInfo = getTokenInfo('Tether USD');
      expect(tokenInfo.symbol).toBe('USDt');
      expect(tokenInfo.name).toBe('Tether USD');
      expect(tokenInfo.decimals).toBe(6);
    });

    it('should throw error for unknown token', () => {
      expect(() => getTokenInfo('UNKNOWN_TOKEN')).toThrow(
        'Token UNKNOWN_TOKEN not found in TokenMapping',
      );
    });

    it('should return faAddress for tokens with faAddress', () => {
      const address = getTokenAddress('USDt');
      expect(address).toBe(
        '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
      );
    });

    it('should return faAddress when available, tokenAddress otherwise', () => {
      // APT has both faAddress and tokenAddress, should return faAddress
      const aptAddress = getTokenAddress('APT');
      expect(aptAddress).toBe('0xa');

      // Find a token that only has tokenAddress (no faAddress)
      const tokenWithOnlyTokenAddress = TokenMapping.find(
        (token) => token.tokenAddress && !token.faAddress,
      );

      if (tokenWithOnlyTokenAddress) {
        const address = getTokenAddress(tokenWithOnlyTokenAddress.symbol);
        expect(address).toBe(tokenWithOnlyTokenAddress.tokenAddress);
      }
    });
  });

  describe('Swap Quote Functions', () => {
    const mockQuoteResponse = {
      fromToken: {
        address: '0x1::aptos_coin::AptosCoin',
        decimals: 8,
        current_price: '10.5',
      },
      toToken: {
        address:
          '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
        decimals: 6,
        current_price: '1.0',
      },
      fromTokenAmount: '1000000000',
      fromTokenAmountUSD: '10.50',
      quotes: [
        {
          toTokenAmount: '10500000',
          priceImpact: '0.1',
          slippagePercentage: '0.5',
          route: [],
          minToTokenAmount: '10447500',
          toTokenAmountUSD: '10.50',
          feeAmount: '0',
          feeAmountUSD: '0',
          feeToken: {
            tokenType: '0x1::aptos_coin::AptosCoin',
            name: 'Aptos Coin',
            symbol: 'APT',
            decimals: 8,
          },
          transactionPayload: {
            function: 'swap_function',
            type_arguments: [],
            arguments: [],
          },
        },
      ],
    };

    it('should get exact in swap quote', async () => {
      mockPanora.SwapQuote.mockResolvedValue(mockQuoteResponse);

      const params = {
        chainId: '1',
        fromTokenAddress: '0x1::aptos_coin::AptosCoin' as `0x${string}`,
        toTokenAddress:
          '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b' as `0x${string}`,
        fromTokenAmount: '1000000000',
        toWalletAddress: '0x123456789abcdef' as `0x${string}`,
        slippagePercentage: '0.5',
      };

      const result = await PanoraRouter.preSwapQuote(params);

      expect(mockPanora.SwapQuote).toHaveBeenCalledWith({
        params: {
          chainId: '1',
          fromTokenAddress: '0x1::aptos_coin::AptosCoin',
          toTokenAddress:
            '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
          fromTokenAmount: '1000000000',
          toWalletAddress: '0x123456789abcdef',
          slippagePercentage: '0.5',
          integratorFeeAddress: undefined,
          integratorFeePercentage: undefined,
        },
      });

      expect(result).toEqual(mockQuoteResponse);
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should handle APT to USDT swap workflow', async () => {
      const mockQuoteResponse = {
        fromToken: {
          address: '0x1::aptos_coin::AptosCoin',
          decimals: 8,
          current_price: '10.5',
        },
        toToken: {
          address:
            '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
          decimals: 6,
          current_price: '1.0',
        },
        fromTokenAmount: '100000000', // 1 APT
        fromTokenAmountUSD: '10.50',
        quotes: [
          {
            toTokenAmount: '10500000', // 10.5 USDT
            priceImpact: '0.1',
            slippagePercentage: '0.5',
            route: [],
            minToTokenAmount: '10447500',
            toTokenAmountUSD: '10.50',
            feeAmount: '0',
            feeAmountUSD: '0',
            feeToken: {
              tokenType: '0x1::aptos_coin::AptosCoin',
              name: 'Aptos Coin',
              symbol: 'APT',
              decimals: 8,
            },
            transactionPayload: {
              function: 'swap_function',
              type_arguments: [],
              arguments: [],
            },
          },
        ],
      };

      const mockSwapResponse = {
        quotes: [
          {
            txData: {
              function: 'swap_function',
              type_arguments: [],
              arguments: [],
            },
          },
        ],
      };

      mockPanora.SwapQuote.mockResolvedValue(mockQuoteResponse);
      mockPanora.Swap.mockResolvedValue(mockSwapResponse);

      // Step 1: Get token addresses
      const fromTokenAddress = getTokenAddress('APT');
      const toTokenAddress = getTokenAddress('USDt');

      expect(fromTokenAddress).toBe('0xa'); // APT faAddress
      expect(toTokenAddress).toBe(
        '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
      );

      // Step 2: Get swap quote
      const quote = await PanoraRouter.preSwapQuote({
        chainId: '1',
        fromTokenAddress: fromTokenAddress!,
        toTokenAddress: toTokenAddress!,
        fromTokenAmount: '100000000', // 1 APT
        toWalletAddress: '0x123456789abcdef' as `0x${string}`,
        slippagePercentage: '0.5',
      });

      expect(quote).toEqual(mockQuoteResponse);

      // Step 3: Execute swap
      const swapResult = await PanoraRouter.exactSwap({
        params: {
          chainId: '1',
          fromTokenAddress: fromTokenAddress!,
          toTokenAddress: toTokenAddress!,
          fromTokenAmount: '100000000',
          toWalletAddress: '0x123456789abcdef' as `0x${string}`,
          slippagePercentage: '0.5',
        },
        privateKey: '0x123456789abcdef',
      });

      expect(swapResult).toEqual(mockSwapResponse);
    });

    it('should handle error cases gracefully', async () => {
      // Test SDK error handling
      const errorMessage = 'Insufficient liquidity';
      mockPanora.SwapQuote.mockRejectedValue(new Error(errorMessage));

      await expect(
        PanoraRouter.preSwapQuote({
          chainId: '1',
          fromTokenAddress: '0x1::aptos_coin::AptosCoin' as `0x${string}`,
          toTokenAddress:
            '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b' as `0x${string}`,
          fromTokenAmount: '1000000000',
          toWalletAddress: '0x123456789abcdef' as `0x${string}`,
          slippagePercentage: '0.5',
        }),
      ).rejects.toThrow(errorMessage);
    });
  });
});
