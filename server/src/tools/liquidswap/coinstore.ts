import { Aptos, Account } from '@aptos-labs/ts-sdk';

export async function registerCoinStore(
  aptos: Aptos,
  account: Account,
  coinType: string,
): Promise<void> {
  try {
    const registerPayload = {
      function:
        '0x1::managed_coin::register' as `${string}::${string}::${string}`,
      typeArguments: [coinType],
      functionArguments: [],
    };

    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: registerPayload,
    });

    const response = await aptos.transaction.signAndSubmitTransaction({
      signer: account,
      transaction: transaction,
    });

    await aptos.waitForTransaction({
      transactionHash: response.hash,
    });

    console.log(`Registered CoinStore for ${coinType}`);
  } catch (error) {
    throw new Error(
      `CoinStore might already be registered for ${coinType}: ${error}`,
    );
  }
}

export async function checkCoinStoreRegistered(
  aptos: Aptos,
  account: Account,
  coinType: string,
): Promise<boolean> {
  try {
    const payload = {
      function:
        '0x1::coin::is_account_registered' as `${string}::${string}::${string}`,
      typeArguments: [coinType],
      functionArguments: [account.accountAddress.toString()],
    };

    const transaction = await aptos.view({ payload });

    return transaction[0] as boolean;
  } catch (error) {
    throw new Error(
      `CoinStore might not be registered for ${coinType}: ${error}`,
    );
  }
}
