import type {
  InputGenerateTransactionPayloadData,
  MoveStructId,
  Aptos,
  Account,
} from '@aptos-labs/ts-sdk';

export async function withdrawTokensWithEchelon(
  aptos: Aptos,
  account: Account,
  mintType: MoveStructId,
  amount: number,
  poolAddress: string,
  fungibleAsset: boolean,
): Promise<string> {
  try {
    const FUNCTIONAL_ARGS_DATA = [poolAddress, amount];

    const COIN_STANDARD_DATA: InputGenerateTransactionPayloadData = {
      function:
        '0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba::scripts::withdraw',
      typeArguments: [mintType.toString()],
      functionArguments: FUNCTIONAL_ARGS_DATA,
    };

    const FUNGIBLE_ASSET_DATA: InputGenerateTransactionPayloadData = {
      function:
        '0xc6bc659f1649553c1a3fa05d9727433dc03843baac29473c817d06d39e7621ba::scripts::withdraw_fa',
      functionArguments: FUNCTIONAL_ARGS_DATA,
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
      throw new Error('Failed to withdraw tokens');
    }

    console.log(response.hash);
    return response.hash;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to withdraw tokens: ' + error);
  }
}
