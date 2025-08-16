import {
  Account,
  Aptos,
  type InputGenerateTransactionPayloadData,
  type MoveStructId,
} from '@aptos-labs/ts-sdk';
import { AptosPriceServiceConnection } from '@pythnetwork/pyth-aptos-js';
import { priceFeed } from '../constants/price-feed';

const getPythData = async () => {
  const connection = new AptosPriceServiceConnection(
    'https://hermes.pyth.network',
  );

  return await connection.getPriceFeedsUpdateData(priceFeed);
};

export async function borrowTokensWithJoule(
  aptos: Aptos,
  account: Account,
  mint: MoveStructId,
  amount: number,
  positionId: string,
  fungibleAsset: boolean,
): Promise<{ hash: string; positionId: string } | undefined> {
  try {
    const pyth_update_data = await getPythData();

    const DEFAULT_FUNCTIONAL_ARGS = [positionId, amount, pyth_update_data];

    const COIN_STANDARD_DATA: InputGenerateTransactionPayloadData = {
      function:
        '0x2fe576faa841347a9b1b32c869685deb75a15e3f62dfe37cbd6d52cc403a16f6::pool::borrow',
      typeArguments: [mint.toString()],
      functionArguments: DEFAULT_FUNCTIONAL_ARGS,
    };

    const FUNGIBLE_ASSET_DATA: InputGenerateTransactionPayloadData = {
      function:
        '0x2fe576faa841347a9b1b32c869685deb75a15e3f62dfe37cbd6d52cc403a16f6::pool::borrow_fa',
      functionArguments: [
        positionId,
        mint.toString(),
        amount,
        pyth_update_data,
      ],
    };

    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: fungibleAsset ? FUNGIBLE_ASSET_DATA : COIN_STANDARD_DATA,
    });

    const response = await aptos.transaction.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    if (!response || !response.hash) {
      throw new Error('Failed to borrow tokens');
    }

    console.log(response.hash);
    return { hash: response.hash, positionId };
  } catch (error) {
    console.error(error);
    throw new Error('Failed to lend tokens: ' + error);
  }
}
