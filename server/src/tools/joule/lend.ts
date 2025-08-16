import {
  Aptos,
  Account,
  type MoveStructId,
  type InputGenerateTransactionPayloadData,
} from '@aptos-labs/ts-sdk';

export async function lendTokensWithJoule(
  aptos: Aptos,
  account: Account,
  mint: MoveStructId,
  amount: number,
  positionId: string,
  newPosition: string,
  fungibleAsset: boolean,
): Promise<string> {
  try {
    const DEFAULT_FUNCTIONAL_ARGS = [positionId, amount, newPosition];

    const COIN_STANDARD_DATA: InputGenerateTransactionPayloadData = {
      function:
        '0x2fe576faa841347a9b1b32c869685deb75a15e3f62dfe37cbd6d52cc403a16f6::pool::lend',
      typeArguments: [mint.toString()],
      functionArguments: DEFAULT_FUNCTIONAL_ARGS,
    };

    const FUNGIBLE_ASSET_DATA: InputGenerateTransactionPayloadData = {
      function:
        '0x2fe576faa841347a9b1b32c869685deb75a15e3f62dfe37cbd6d52cc403a16f6::pool::lend_fa',
      functionArguments: [positionId, mint.toString(), newPosition, amount],
    };

    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: fungibleAsset ? FUNGIBLE_ASSET_DATA : COIN_STANDARD_DATA,
    });

    const response = await aptos.transaction.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    if (!response) {
      throw new Error('Failed to lend tokens');
    }

    console.log(response.hash);
    return response.hash;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to lend tokens: ' + error);
  }
}
