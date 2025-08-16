import { getLastErrorMessage } from './function';
import { Account } from '@aptos-labs/ts-sdk';

export interface ErrorContext {
  operation: string;
  amount?: number;
  userAddress?: string;
  token?: string;
}

interface TransactionResponse {
  hash: string;
}

interface TransactionResult {
  success: boolean;
  hash?: string;
  vm_status?: string;
}

/**
 * Enhanced error handling function for contract execution
 * Provides meaningful English error messages for common blockchain errors
 */
export function handleContractError(
  error: unknown,
  context: ErrorContext,
): string {
  let formattedMessage = 'An unknown error occurred during contract execution.';
  let txHash = '';
  let explorerUrl = '';
  let txHtml = '';

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message: string }).message;

    // Extract transaction hash if available
    const txHashMatch = message.match(/Transaction ([0-9a-fx]+)/i);
    if (txHashMatch) {
      txHash = txHashMatch[1];
      explorerUrl = `https://explorer.aptoslabs.com/txn/${txHash}`;
      txHtml = `<br/><a href="${explorerUrl}" target="_blank" rel="noopener noreferrer">View transaction details</a>`;
    }

    // Check for specific error patterns
    if (message.includes('INSUFFICIENT_BALANCE_FOR_TRANSACTION_FEE')) {
      formattedMessage =
        'Insufficient APT balance to pay transaction fee. Please deposit more APT into your wallet.';
    } else if (message.includes('OUT_OF_GAS')) {
      formattedMessage =
        'Transaction used more gas than the set limit. Please try again with a higher gas limit.';
    } else if (message.includes('SEQUENCE_NUMBER_TOO_OLD')) {
      formattedMessage =
        'Sequence number has already been used. Please try again with a new transaction.';
    } else if (message.includes('SEQUENCE_NUMBER_TOO_NEW')) {
      formattedMessage =
        'Sequence number is too high. Please wait and try again.';
    } else if (message.includes('INVALID_SIGNATURE')) {
      formattedMessage =
        'Invalid signature. Please sign the transaction again.';
    } else if (message.includes('INVALID_AUTH_KEY')) {
      formattedMessage =
        'Invalid authentication key. Please check your account.';
    } else if (message.includes('TRANSACTION_EXPIRED')) {
      formattedMessage =
        'Transaction has expired. Please create a new transaction.';
    } else if (message.includes('SENDING_ACCOUNT_DOES_NOT_EXIST')) {
      formattedMessage =
        'Sender account does not exist. Please create the account first.';
    } else if (message.includes('EINSUFFICIENT_BALANCE')) {
      const amountText = context.amount ? `${context.amount} ` : '';
      const tokenText = context.token || 'APT';
      formattedMessage = `Insufficient balance to ${context.operation} ${amountText}${tokenText}. Please check your wallet balance.`;
    } else if (message.includes('RESOURCE_DOES_NOT_EXIST')) {
      formattedMessage =
        'Required resource does not exist. Please initialize your account before making this transaction.';
    } else if (message.includes('RESOURCE_ALREADY_EXISTS')) {
      formattedMessage = 'Resource already exists. Please try again later.';
    } else if (message.includes('ECOIN_STORE_NOT_PUBLISHED')) {
      formattedMessage =
        'Account has not been initialized for this token. Please register the account first.';
    } else if (message.includes('LOOKUP_FAILED')) {
      formattedMessage =
        'Could not find contract function. Please check the contract version.';
    } else if (message.includes('LINKER_ERROR')) {
      formattedMessage =
        'Contract linking error. Please check the contract address and function name.';
    } else if (message.includes('INVALID_ARGUMENT')) {
      const amountText = context.amount ? ` ${context.amount}` : '';
      formattedMessage = `Invalid argument. Please check the amount${amountText}.`;
    } else if (message.includes('ABORTED')) {
      formattedMessage =
        'Transaction was aborted due to a conflict. Please try again later.';
    } else if (message.includes('UNAVAILABLE')) {
      formattedMessage =
        'Blockchain service is temporarily unavailable. Please try again later.';
    } else if (
      message.includes('INTERNAL') ||
      message.includes('Internal error')
    ) {
      formattedMessage =
        'Internal system error. Please try again later or contact support.';
    } else if (
      message.includes('network') ||
      message.includes('Network') ||
      message.includes('timeout')
    ) {
      formattedMessage =
        'Network error or connection timeout. Please check your internet connection and try again.';
    } else if (
      message.includes('Too many requests') ||
      message.includes('Rate limit')
    ) {
      formattedMessage =
        'Too many requests. Please wait a moment and try again.';
    } else if (
      message.includes('Failed to stake') ||
      message.includes('stake')
    ) {
      const amountText = context.amount ? ` ${context.amount} APT` : '';
      formattedMessage = `Unable to stake${amountText}. Please check your balance and staking conditions.`;
    } else if (
      message.includes('Failed to unstake') ||
      message.includes('unstake')
    ) {
      const amountText = context.amount ? ` ${context.amount} APT` : '';
      formattedMessage = `Unable to unstake${amountText}. Please check your staked balance and unstaking conditions.`;
    } else if (message.includes('Failed to swap') || message.includes('swap')) {
      formattedMessage =
        'Unable to perform swap. Please check your balance and swap conditions.';
    } else if (
      message.includes('Failed to borrow') ||
      message.includes('borrow')
    ) {
      formattedMessage =
        'Unable to perform borrow. Please check your collateral and borrowing conditions.';
    } else if (message.includes('Failed to lend') || message.includes('lend')) {
      formattedMessage =
        'Unable to perform lend. Please check your balance and lending conditions.';
    } else if (
      message.includes('Failed to repay') ||
      message.includes('repay')
    ) {
      formattedMessage =
        'Unable to perform repay. Please check your balance and loan.';
    } else if (message.includes('Pool') && message.includes('does not exist')) {
      formattedMessage = 'Pool does not exist. Please check the token pair.';
    } else if (message.includes('Slippage')) {
      formattedMessage =
        'Slippage is too high. Please increase slippage tolerance or try again later.';
    } else if (message.includes('Insufficient liquidity')) {
      formattedMessage =
        'Insufficient liquidity. Please reduce the transaction amount or try again later.';
    } else {
      // Extract transaction error details if available
      const txErrorMatch = message.match(
        /Transaction ([0-9a-fx]+) failed with an error: (.+)/i,
      );
      if (txErrorMatch && txErrorMatch.length >= 3) {
        const errorDetail = getLastErrorMessage(txErrorMatch[2]);
        formattedMessage = `Transaction failed: ${errorDetail}`;
      } else {
        formattedMessage = getLastErrorMessage(message);
      }
    }
  } else if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code: number }).code;
    switch (code) {
      case -32002:
        formattedMessage =
          'Transaction execution error. Please check the parameters and try again.';
        break;
      case -32010:
        formattedMessage =
          'Too many requests. Please wait a moment and try again.';
        break;
      case -32050:
        formattedMessage = 'Temporary error. Please try again later.';
        break;
      case -32602:
        formattedMessage =
          'Invalid parameters. Please check the transaction information.';
        break;
      case -32603:
        formattedMessage = 'Internal JSON-RPC error. Please try again later.';
        break;
      default:
        formattedMessage = `System error (code: ${code}). Please try again later.`;
    }
  } else if (error && typeof error === 'string') {
    formattedMessage = error;
  }

  return `${formattedMessage}${txHtml}`;
}

/**
 * Validates common transaction parameters
 */
export function validateTransactionParams(params: {
  amount?: number;
  account?: Account;
  operation: string;
}): void {
  if (params.amount !== undefined && (params.amount <= 0 || !params.amount)) {
    throw new Error(`The amount to ${params.operation} must be greater than 0`);
  }

  if (params.account && !params.account.accountAddress) {
    throw new Error('Invalid account');
  }
}

/**
 * Validates transaction response
 */
export function validateTransactionResponse(
  response: TransactionResponse | null | undefined,
  operation: string,
): void {
  if (!response || !response.hash) {
    throw new Error(
      `Did not receive transaction hash from blockchain for ${operation}`,
    );
  }
}

/**
 * Validates transaction execution result
 */
export function validateTransactionResult(
  tx: TransactionResult,
  operation: string,
): void {
  if (!tx.success) {
    const vmStatus = tx.vm_status || 'Unknown error';
    throw new Error(
      `Transaction ${operation} failed with VM status: ${vmStatus}`,
    );
  }

  if (!tx.hash) {
    throw new Error(
      `Did not receive transaction hash after processing ${operation}`,
    );
  }
}
