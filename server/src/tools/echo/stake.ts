import { Aptos, Account } from '@aptos-labs/ts-sdk';

export async function stakeTokensWithEcho(
  aptos: Aptos,
  account: Account,
  amount: number,
): Promise<string> {
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function:
          '0xa0281660ff6ca6c1b68b55fcb9b213c2276f90ad007ad27fd003cf2f3478e96e::lsdmanage::stake',
        functionArguments: [amount],
      },
    });

    const response = await aptos.transaction.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    if (!response) {
      throw new Error('Failed to stake tokens');
    }

    console.log(response.hash);
    return response.hash;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to stake tokens: ' + error);
  }
}
