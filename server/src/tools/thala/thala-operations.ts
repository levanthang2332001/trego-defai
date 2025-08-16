// import { Aptos, Account } from '@aptos-labs/ts-sdk';

// type ThalaOperation = 'stake' | 'unstake';

// interface ThalaConfig {
//   stake: {
//     function: string;
//     errorMessage: string;
//   };
//   unstake: {
//     function: string;
//     errorMessage: string;
//   };
// }

// const THALA_CONFIG: ThalaConfig = {
//   stake: {
//     function: '0xfaf4e633ae9eb31366c9ca24214231760926576c7b625313b3688b5e900731f6::scripts::stake_APT_and_thAPT',
//     errorMessage: 'Failed to stake tokens',
//   },
//   unstake: {
//     function: '0xfaf4e633ae9eb31366c9ca24214231760926576c7b625313b3688b5e900731f6::scripts::unstake_thAPT',
//     errorMessage: 'Failed to unstake tokens',
//   },
// };

// export async function executeThalaOperation(
//   operation: ThalaOperation,
//   aptos: Aptos,
//   account: Account,
//   amount: number,
// ): Promise<string> {
//   try {
//     const config = THALA_CONFIG[operation];

//     const transaction = await aptos.transaction.build.simple({
//       sender: account.accountAddress,
//       data: {
//         function: config.function,
//         functionArguments: [amount],
//       },
//     });

//     const response = await aptos.transaction.signAndSubmitTransaction({
//       signer: account,
//       transaction,
//     });

//     if (!response) {
//       throw new Error(config.errorMessage);
//     }

//     console.log(response.hash);
//     return response.hash;
//   } catch (error) {
//     console.error(error);
//     throw new Error(`${THALA_CONFIG[operation].errorMessage}: ${error}`);
//   }
// }

// // Helper functions to maintain the same interface
// export async function stakeTokensWithThala(
//   aptos: Aptos,
//   account: Account,
//   amount: number,
// ): Promise<string> {
//   return executeThalaOperation('stake', aptos, account, amount);
// }

// export async function unstakeTokensWithThala(
//   aptos: Aptos,
//   account: Account,
//   amount: number,
// ): Promise<string> {
//   return executeThalaOperation('unstake', aptos, account, amount);
// }
