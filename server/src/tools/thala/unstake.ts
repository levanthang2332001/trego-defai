import { Aptos, Account } from '@aptos-labs/ts-sdk';
import {
  handleContractError,
  validateTransactionParams,
  validateTransactionResponse,
  validateTransactionResult,
  type ErrorContext,
} from 'src/utils/contract-error-handler';

interface UnstakeResponse {
  vm_status: string;
  hash: string;
}

export async function unstakeTokensWithThala(
  aptos: Aptos,
  account: Account,
  amount: number,
): Promise<UnstakeResponse> {
  const context: ErrorContext = {
    operation: 'unstake',
    amount,
    userAddress: account.accountAddress.toString(),
    token: 'thAPT',
  };

  try {
    // Validate input parameters
    validateTransactionParams({
      amount,
      account,
      operation: 'unstake',
    });

    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function:
          '0xfaf4e633ae9eb31366c9ca24214231760926576c7b625313b3688b5e900731f6::scripts::unstake_thAPT',
        functionArguments: [amount],
      },
    });

    const response = await aptos.transaction.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    validateTransactionResponse(response, 'unstake');

    const tx = await aptos.waitForTransaction({
      transactionHash: response.hash,
    });

    validateTransactionResult(tx, 'unstake');

    return {
      vm_status: tx.vm_status || 'Success',
      hash: tx.hash,
    };
  } catch (error) {
    console.error('Unstake error:', error);
    const errorMessage = handleContractError(error, context);
    throw new Error(errorMessage);
  }
}
