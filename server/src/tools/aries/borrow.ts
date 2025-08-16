import type { MoveStructId, Aptos, Account } from '@aptos-labs/ts-sdk';

export async function borrowTokensWithAries(
  aptos: Aptos,
  account: Account,
  mintType: MoveStructId,
  amount: number,
): Promise<string> {
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function:
          '0x9770fa9c725cbd97eb50b2be5f7416efdfd1f1554beb0750d4dae4c64e860da3::controller::withdraw',
        typeArguments: [mintType],
        functionArguments: ['Main account', amount, true],
      },
    });

    const response = await aptos.transaction.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    if (!response) {
      throw new Error('Failed to borrow tokens');
    }

    return response.hash;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to borrow tokens: ' + error);
  }
}
