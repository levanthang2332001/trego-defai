import { Injectable } from '@nestjs/common';
import {
  executeBridgeFromAptos,
  getBridgeQuote,
} from 'src/tools/stargate/bridge';
import { getTokenBySymbolAndChain } from 'src/tools/stargate/quote';
import {
  BridgeRequestDto,
  BridgeStargateRequestDto,
  ChatResponseDto,
} from '../dto';
import { LoggerService } from './logger.service';
import { aptosAgent } from 'src/utils/aptosAgent';

@Injectable()
export class BridgeService {
  private readonly logger: LoggerService;

  constructor() {
    this.logger = new LoggerService(BridgeService.name);
  }

  private parseErrorMessage(error: any): string {
    if (!(error instanceof Error)) {
      return 'Unknown error occurred';
    }

    const errorStr = error.message.toLowerCase();

    if (
      errorStr.includes('einsufficient_balance') ||
      errorStr.includes('insufficient_balance')
    ) {
      return "Insufficient balance. You don't have enough tokens to complete this transaction.";
    }

    if (
      errorStr.includes('transaction_expired') ||
      errorStr.includes('expired')
    ) {
      return 'Transaction expired. Please try again with a new quote.';
    }

    if (errorStr.includes('invalid_signature')) {
      return 'Invalid signature. Please reconnect your wallet and try again.';
    }

    if (errorStr.includes('network') || errorStr.includes('connection')) {
      return 'Network error. Please check your connection and try again.';
    }

    if (errorStr.includes('gas') && errorStr.includes('insufficient')) {
      return 'Insufficient gas. Please ensure you have enough APT for transaction fees.';
    }

    if (errorStr.includes('slippage')) {
      return 'Price changed too much (slippage). Please try again with a new quote.';
    }

    if (
      errorStr.includes('rate_limit') ||
      errorStr.includes('too_many_requests')
    ) {
      return 'Too many requests. Please wait a moment and try again.';
    }

    if (
      errorStr.includes('unauthorized') ||
      errorStr.includes('authentication')
    ) {
      return 'Authentication failed. Please reconnect your wallet.';
    }

    if (
      errorStr.includes('token not supported') ||
      errorStr.includes('unsupported token')
    ) {
      return 'Token not supported for bridging on this chain.';
    }

    if (
      errorStr.includes('invalid amount') ||
      errorStr.includes('amount too small')
    ) {
      return 'Invalid amount. Please enter a valid amount to bridge.';
    }

    if (errorStr.includes('route not found') || errorStr.includes('no route')) {
      return 'No bridge route available for this token pair.';
    }

    if (errorStr.includes('chain not supported')) {
      return 'Chain not supported. Please select a supported destination chain.';
    }

    // Return original error message if it's user-friendly
    if (
      error.message &&
      error.message.length > 0 &&
      error.message.length < 200
    ) {
      return error.message;
    }

    return 'Operation failed. Please try again.';
  }

  async quoteBridge(bridgeMessage: BridgeRequestDto): Promise<ChatResponseDto> {
    try {
      this.logger.log('Starting bridge quote calculation');

      const {
        tokenA,
        tokenB,
        amount,
        dstAddress,
        srcChainKey,
        dstChainKey,
        user_address,
      } = bridgeMessage;

      const { accounts } = await aptosAgent(user_address);

      const dataA = await getTokenBySymbolAndChain(tokenA, srcChainKey);
      const dataB = await getTokenBySymbolAndChain(tokenB, dstChainKey);

      if (!dataA || !dataB) {
        this.logger.error('Token not found');
        return {
          message: 'Token not found',
          data: null,
        };
      }

      const srcToken = dataA.address;
      const dstToken = dataB.address;

      const srcAmount = this.convertAmountFromDecimals(amount, dataA.decimals);

      const { quote } = await getBridgeQuote({
        srcToken,
        dstToken,
        srcAddress: accounts.accountAddress.toString(),
        dstAddress,
        srcChainKey,
        dstChainKey,
        srcAmount: srcAmount,
        dstAmountMin: srcAmount,
      });

      return {
        message: 'Bridge quote calculated successfully',
        data: {
          quote,
          decimalsSrcToken: dataA.decimals,
          decimalsDstToken: dataB.decimals,
          symbolSrcToken: dataA.symbol,
          symbolDstToken: dataB.symbol,
        },
      };
    } catch (error) {
      this.logger.error(error);
      const errorMessage = this.parseErrorMessage(error);

      return {
        message: errorMessage,
        data: {
          error: errorMessage,
        },
      };
    }
  }

  convertAmountFromDecimals(amount: string, decimals: number): string {
    const result = Number(amount) * 10 ** decimals;
    return result.toString();
  }

  async executeBridge(
    params: BridgeStargateRequestDto,
  ): Promise<ChatResponseDto> {
    try {
      this.logger.log('Starting bridge execution');
      const { quote, user_address } = params;

      if (!quote || !user_address) {
        return {
          message: 'Invalid quote or user address',
          data: null,
        };
      }
      const { aptos, accounts } = await aptosAgent(user_address);
      const txHash = await executeBridgeFromAptos(aptos, accounts, quote);

      return {
        message: 'Bridge executed successfully',
        data: {
          transactionHash: txHash,
        },
      };
    } catch (error) {
      this.logger.error(error);
      const errorMessage = this.parseErrorMessage(error);

      return {
        message: errorMessage,
        data: {
          error: errorMessage,
        },
      };
    }
  }
}
