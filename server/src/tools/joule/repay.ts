import {
  Account,
  Aptos,
  type InputGenerateTransactionPayloadData,
  type MoveStructId,
} from '@aptos-labs/ts-sdk';

export async function repayTokensWithJoule(
  aptos: Aptos,
  account: Account,
  amount: number,
  mint: MoveStructId,
  positionId: string,
  fungibleAsset: boolean,
): Promise<{ hash: string; positionId: string } | undefined> {
  try {
    const DEFAULT_FUNCTIONAL_ARGS = [positionId, amount];

    const COIN_STANDARD_DATA: InputGenerateTransactionPayloadData = {
      function:
        '0x2fe576faa841347a9b1b32c869685deb75a15e3f62dfe37cbd6d52cc403a16f6::pool::repay',
      typeArguments: [mint.toString()],
      functionArguments: DEFAULT_FUNCTIONAL_ARGS,
    };

    const FUNGIBLE_ASSET_DATA: InputGenerateTransactionPayloadData = {
      function:
        '0x2fe576faa841347a9b1b32c869685deb75a15e3f62dfe37cbd6d52cc403a16f6::pool::repay_fa',
      functionArguments: [positionId, mint.toString(), amount],
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
      throw new Error('Failed to repay tokens');
    }

    console.log(response.hash);
    return { hash: response.hash, positionId };
  } catch (error) {
    console.error(error);
    throw new Error('Failed to repay tokens: ' + error);
  }
}
