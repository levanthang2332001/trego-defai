import {
  InputGenerateTransactionPayloadData,
  Network,
} from '@aptos-labs/ts-sdk';
import { initHyperionSDK } from '@hyperionxyz/sdk';
import {
  PreSwapHyperionRequestDto,
  SwapHyperionRequestDto,
} from 'src/actions/swap/dto/hyperion.dto';
import {
  validateTransactionParams,
  validateTransactionResult,
} from 'src/utils';
import { aptosAgent } from 'src/utils/aptosAgent';

const sdk = initHyperionSDK({
  network: Network.MAINNET,
  APTOS_API_KEY: 'aptoslabs_cB8VjdnQTiF_An9kQqTWfbhUs8qtCapmUxBD25QRK7e1g',
});

interface PreSwapResult {
  amountOut: string;
  amountIn: string;
  path: Array<string>;
}

const calculateAmount = (amount: string, decimals: number) => {
  return Number(amount) * Math.pow(10, decimals);
};

const calculateAmountUsd = (amount: string, decimals: number) => {
  return Number(amount) / Math.pow(10, decimals);
};

export const preSwap = async (swapMessage: PreSwapHyperionRequestDto) => {
  validateTransactionParams({
    amount: Number(swapMessage.amount),
    operation: 'pre-swap',
  });

  const currencyAAmount = calculateAmount(
    swapMessage.amount,
    swapMessage.fromToken.decimals,
  );

  const result = (await sdk.Swap.estToAmount({
    amount: currencyAAmount,
    from: swapMessage.fromToken.faAddress,
    to: swapMessage.toToken.tokenAddress,
  })) as PreSwapResult;

  const formatResult = {
    ...result,
    amountInUsd: calculateAmountUsd(
      result.amountIn,
      swapMessage.fromToken.decimals,
    ),
    amountOutUsd: calculateAmountUsd(
      result.amountOut,
      swapMessage.toToken.decimals,
    ),
  };

  return formatResult;
};

interface SwapResult {
  function: string;
  typeArguments: string[];
  functionArguments: [[string], string, string, string, number, string];
}

export const swap = async ({
  userAddress,
  swapMessage,
}: {
  userAddress: string;
  swapMessage: SwapHyperionRequestDto;
}) => {
  try {
    const { aptos, accounts } = await aptosAgent(userAddress);

    const result = (await sdk.Swap.swapTransactionPayload({
      currencyA: swapMessage.fromToken.faAddress,
      currencyB: swapMessage.toToken.faAddress,
      currencyAAmount: swapMessage.amountIn,
      currencyBAmount: swapMessage.amountOut,
      poolRoute: swapMessage.path,
      slippage: swapMessage.slippage || 0.5,
      recipient: accounts.accountAddress.toString(),
    })) as SwapResult;

    const transaction = await aptos.transaction.build.simple({
      sender: accounts.accountAddress,
      data: result as InputGenerateTransactionPayloadData,
    });

    const response = await aptos.transaction.signAndSubmitTransaction({
      signer: accounts,
      transaction,
    });

    const tx = await aptos.waitForTransaction({
      transactionHash: response.hash,
    });

    validateTransactionResult(tx, 'swap');

    return {
      hash: tx.hash,
    };
  } catch (error) {
    console.error('Swap execution failed:', error);
    return {
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
