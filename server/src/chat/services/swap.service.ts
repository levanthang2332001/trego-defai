import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { LoggerService } from './logger.service';
import { PreswapRequestDto, ChatResponseDto } from '../dto';
import { aptosAgent } from '../../utils/aptosAgent';
import {
  swapTokensWithLiquidswap,
  calculateLiquidswapRate,
} from '../../tools/liquidswap/swap';

@Injectable()
export class SwapService {
  private readonly logger: LoggerService;

  constructor() {
    this.logger = new LoggerService(SwapService.name);
  }

  async preSwap(swapMessage: PreswapRequestDto): Promise<ChatResponseDto> {
    try {
      this.logger.log('Starting pre-swap calculation');

      const {
        user_address,
        fromToken,
        toToken,
        fromAmount,
        curveType,
        version,
      } = swapMessage;

      // Compose payload for rate calculation
      const payload = {
        fromToken,
        toToken,
        amount: fromAmount,
        curveType: curveType ?? 'stable',
        interactiveToken: 'from' as const,
        version: version ?? 0,
      };

      const toAmount = await calculateLiquidswapRate(payload);

      if (!toAmount) {
        this.logger.error('Failed to calculate swap rate');
        return {
          message: 'Failed to calculate swap rate',
          data: null,
        };
      }

      this.logger.log('Pre-swap calculation completed successfully');

      return {
        message: 'pre_swap successful',
        data: {
          action: 'PRE_SWAP',
          address: user_address,
          fromToken,
          toToken,
          fromAmount,
          toAmount,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Pre-swap calculation failed', error);

      return {
        message: `Failed to calculate swap rate: ${errorMessage}`,
        data: null,
      };
    }
  }

  /**
   * Execute a token swap transaction on the Aptos blockchain.
   *
   * This method performs the actual blockchain transaction to swap tokens using
   * the Liquidswap protocol. It handles wallet management, transaction signing,
   * and execution.
   *
   * @param swapMessage - The swap execution parameters
   * @param swapMessage.user_address - User's Aptos wallet address (must have sufficient balance)
   * @param swapMessage.fromToken - Source token address to swap from
   * @param swapMessage.toToken - Destination token address to swap to
   * @param swapMessage.fromAmount - Amount to swap (must be <= wallet balance)
   * @param swapMessage.curveType - Liquidswap curve type for optimal routing
   * @param swapMessage.version - Protocol version to use for the swap
   *
   * @returns Promise resolving to ChatResponseDto containing transaction hash and actual received amount
   *
   * @example
   * ```typescript
   * // Execute APT to USDT swap
   * const result = await swapService.executeSwap({
   *   user_address: '0x096bb31c6b9e3e7cac6857fd2bae9dd2a79c0e74a075193504895606765c9fd8',
   *   fromToken: '0x1::aptos_coin::AptosCoin',
   *   toToken: '0xf22bede237a07e121b56d91a491eb7bcdfd1f5907926a9e58338f964a01b17fa::asset::USDT',
   *   fromAmount: 1000000, // 0.01 APT
   *   curveType: 'stable',
   *   version: 0
   * });
   *
   * // Expected result:
   * // {
   * //   message: 'Swap executed successfully',
   * //   data: {
   * //     transactionHash: '0x1a2b3c4d5e6f7890abcdef1234567890fedcba0987654321deadbeef12345678',
   * //     toAmount: 94857 // Actual amount received after execution
   * //   }
   * // }
   * ```
   *
   * @throws {HttpException} When swap execution fails due to:
   * - Insufficient balance (HTTP 500)
   * - Network connection issues (HTTP 500)
   * - Invalid response from Liquidswap (HTTP 500)
   * - Transaction execution errors (HTTP 500)
   *
   * @remarks
   * **Security Considerations:**
   * - Private keys are encrypted and handled securely
   * - No private keys are stored on servers
   * - Transaction is signed locally before submission
   *
   * **Prerequisites:**
   * - Wallet must have sufficient balance for swap amount + gas fees
   * - Network connection to Aptos blockchain
   * - Valid token addresses and amounts
   */
  async executeSwap(swapMessage: PreswapRequestDto): Promise<ChatResponseDto> {
    try {
      this.logger.log('Starting swap execution');

      const {
        user_address,
        fromToken,
        toToken,
        fromAmount,
        curveType,
        version,
      } = swapMessage;

      const { aptos, accounts } = await aptosAgent(user_address);

      const swapRequest = {
        fromToken,
        toToken,
        amount: fromAmount,
        curveType: curveType ?? 'stable',
        interactiveToken: 'from' as const,
        version: version ?? 0,
      };

      const result = await swapTokensWithLiquidswap(
        swapRequest,
        aptos,
        accounts,
      );

      if (!result || !result.hash) {
        this.logger.error('Swap failed: Invalid response from liquidswap');
        throw new HttpException(
          'Swap failed: Invalid response',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      this.logger.log(`Swap executed successfully with hash: ${result.hash}`);

      return {
        message: 'Swap executed successfully',
        data: {
          transactionHash: result.hash,
          toAmount: result.toAmount,
        },
      };
    } catch (error) {
      this.logger.error('Swap execution failed', error);

      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        `Swap failed: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
