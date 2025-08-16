import {
  Account,
  Aptos,
  AptosConfig,
  Ed25519PrivateKey,
  Network,
} from '@aptos-labs/ts-sdk';
import { Accounts } from '../wallet/accounts';

export const aptosAgent = async (user_address: string) => {
  const aptosConfig = new AptosConfig({ network: Network.MAINNET });
  const aptos = new Aptos(aptosConfig);

  const account = new Accounts();
  const privateKey = await account.getPrivateKeyByAddress(user_address);

  if (!privateKey) {
    throw new Error('Private key not found');
  }

  const accounts = Account.fromPrivateKey({
    privateKey: new Ed25519PrivateKey(privateKey),
  });

  // const signer = new LocalSigner(accounts, Network.MAINNET);
  // const agent = new AgentRuntime(signer, aptos);

  return { aptos, accounts };
};
