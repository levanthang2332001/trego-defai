import { Aptos, Account } from '@aptos-labs/ts-sdk';
import {
  handleContractError,
  validateTransactionParams,
  validateTransactionResponse,
  validateTransactionResult,
  type ErrorContext,
} from 'src/utils/contract-error-handler';

interface StakeResponse {
  hash: string;
}

export async function stakeTokensWithThala(
  aptos: Aptos,
  account: Account,
  amount: number,
): Promise<StakeResponse> {
  const context: ErrorContext = {
    operation: 'stake',
    amount,
    userAddress: account.accountAddress.toString(),
    token: 'APT',
  };

  try {
    // Validate input parameters
    validateTransactionParams({
      amount,
      account,
      operation: 'stake',
    });

    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function:
          '0xfaf4e633ae9eb31366c9ca24214231760926576c7b625313b3688b5e900731f6::scripts::stake_APT_and_thAPT',
        functionArguments: [amount],
      },
    });

    const response = await aptos.transaction.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    validateTransactionResponse(response, 'stake');

    const tx = await aptos.waitForTransaction({
      transactionHash: response.hash,
    });

    validateTransactionResult(tx, 'stake');

    return {
      hash: tx.hash,
    };
  } catch (error) {
    console.error('Stake error:', error);
    const errorMessage = handleContractError(error, context);
    throw new Error(errorMessage);
  }
}
