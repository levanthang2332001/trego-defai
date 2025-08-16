import type { Aptos, Account } from '@aptos-labs/ts-sdk';

export async function createProfileWithAries(
  aptos: Aptos,
  account: Account,
): Promise<string> {
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function:
          '0x9770fa9c725cbd97eb50b2be5f7416efdfd1f1554beb0750d4dae4c64e860da3::controller::register_user',
        functionArguments: ['Main account'],
      },
    });

    const response = await aptos.transaction.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    if (!response) {
      throw new Error('Failed to create profile');
    }

    console.log(response.hash);
    return response.hash;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to create profile: ' + error);
  }
}
