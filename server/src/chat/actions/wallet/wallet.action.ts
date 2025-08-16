import { ChatResponse } from 'src/chat/entities/chat.entity';
import { AbstractBaseAction } from '../base/base-action';
import { aptosAgent } from 'src/utils/aptosAgent';
import { tokensList } from 'src/utils/token';

// No params required for wallet balance
type WalletParams = Record<string, never>;

class WalletAction extends AbstractBaseAction<WalletParams> {
  readonly name = 'wallet';
  readonly similar = [
    'wallet',
    'my wallet',
    'show wallet',
    'wallet balance',
    'account balance',
    'portfolio',
    'my tokens',
    'my assets',
  ];
  readonly prompt = `Extract the following parameters for a wallet action as JSON: {}`;
  readonly examples = [
    'Show my wallet',
    'What is my balance?',
    'List my tokens',
    'Show my portfolio',
  ];

  async handle(
    _params: WalletParams,
    user_address: string,
  ): Promise<ChatResponse> {
    try {
      const { aptos, accounts } = await aptosAgent(user_address);
      const balances: Record<string, string> = {};
      let hasAny = false;

      for (const token of tokensList) {
        try {
          // CoinStore resource type for this token
          const resourceType =
            `0x1::coin::CoinStore<${token.tokenAddress}>` as `${string}::${string}::${string}`;

          const resource: unknown = await aptos.getAccountResource({
            accountAddress: accounts.accountAddress,
            resourceType,
          });
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
          const value: string | undefined = (resource as any)?.data?.coin
            ?.value;
          if (value && !isNaN(Number(value))) {
            const amount = Number(value) / Math.pow(10, token.decimals);
            balances[token.name] = amount.toString();
            hasAny = true;
          } else {
            balances[token.name] = '0';
          }
        } catch {
          balances[token.name] = '0';
        }
      }

      const message = hasAny
        ? 'Here are your wallet balances:'
        : 'No tokens found in your wallet.';

      return this.createSuccessResult({
        message,
        data: balances,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      return this.createErrorResult(
        `Failed to fetch wallet balances: ${errorMessage}`,
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validateMissingParams(_params: Partial<WalletParams>): string[] {
    // No required params for wallet balance
    return [];
  }
}

export const walletAction = new WalletAction();
