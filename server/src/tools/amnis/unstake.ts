import { type AccountAddress, Aptos, Account } from '@aptos-labs/ts-sdk';

export async function unstakeTokensWithAmnis(
  aptos: Aptos,
  account: Account,
  to: AccountAddress,
  amount: number,
): Promise<string> {
  try {
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: {
        function:
          '0x111ae3e5bc816a5e63c2da97d0aa3886519e0cd5e4b046659fa35796bd11542a::router::unstake_entry',
        functionArguments: [amount, to.toString()],
      },
    });

    const response = await aptos.transaction.signAndSubmitTransaction({
      signer: account,
      transaction,
    });

    if (!response) {
      throw new Error('Failed to unstake tokens');
    }

    return response.hash;
  } catch (error) {
    console.error(error);
    throw new Error('Failed to unstake tokens: ' + error);
  }
}
