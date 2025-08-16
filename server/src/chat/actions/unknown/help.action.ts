import { ChatResponse } from 'src/chat/entities/chat.entity';
import { ParamsType, ActionType } from '../../entities/intent.entity';
import { AbstractBaseAction } from '../base/base-action';
import { actionRegistry } from '../registry/action.registry';

export class HelpAction extends AbstractBaseAction<ParamsType> {
  readonly name = 'help';
  readonly similar = [
    'help',
    'how to',
    'what is',
    'show me',
    'examples',
    'guide',
    'tutorial',
    'information',
    'learn',
    'explain',
    'bridge examples',
    'staking examples',
    'swap examples',
  ];
  readonly prompt = `Extract the following parameters for help requests as JSON:
    {
      "topic": "string - the topic user wants help with (e.g., 'bridge', 'staking', 'swap', 'general')"
    }`;

  readonly examples = [
    'How to bridge tokens to other chains?',
    'Show me bridge command examples',
    'What information do I need for bridging?',
    'What is staking and how does it work?',
    'Show me examples of DeFi commands',
    'How to provide liquidity to pools?',
  ];

  // eslint-disable-next-line @typescript-eslint/require-await
  async handle(params: ParamsType): Promise<ChatResponse> {
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      const topic = (params as any)?.topic?.toLowerCase() || 'general';

      let message = '';
      let examples: string[] = [];

      switch (topic) {
        case 'bridge':
        case 'bridging': {
          message = `# 🌉 Bridge Guide\n\nBridging allows you to transfer tokens between different blockchains. Here's how to use it:\n\n## Format:\n\`Bridge [amount] [token] from Aptos to [destination_chain] for address [your_evm_address]\`\n\n## Supported Chains:\n- **BSC** (Binance Smart Chain)\n- **Ethereum**\n- **Polygon** \n- **Base**\n\n## ⚠️ Important:\nYou MUST provide your destination wallet address on the target chain.\n\n## Examples:`;
          examples = actionRegistry.getActionExamples(ActionType.BRIDGE);
          break;
        }

        case 'stake':
        case 'staking': {
          message = `# 💰 Staking Guide\n\nStaking allows you to earn rewards by locking your tokens for a period.\n\n## Format:\n\`Stake [amount] [token]\`\n\n## Benefits:\n- Earn passive rewards\n- Support network security\n- Compound your holdings\n\n## Examples:`;
          examples = actionRegistry.getActionExamples(ActionType.STAKING);
          break;
        }

        case 'swap':
        case 'swapping': {
          message = `# 🔄 Swap Guide\n\nSwap allows you to exchange one token for another.\n\n## Format:\n\`Swap [amount] [from_token] to [to_token]\`\n\n## Supported Tokens:\n- APT (Aptos)\n- ALT\n- USDC\n- USDT\n\n## Examples:`;
          examples = actionRegistry.getActionExamples(ActionType.SWAP);
          break;
        }

        case 'unstake':
        case 'unstaking': {
          message = `# 📤 Unstaking Guide\n\nUnstaking allows you to withdraw your staked tokens.\n\n## Format:\n\`Unstake [amount] [token]\`\n\n## Note:\n- Some protocols may have unbonding periods\n- You'll stop earning rewards after unstaking\n\n## Examples:`;
          examples = actionRegistry.getActionExamples(ActionType.UNSTAKING);
          break;
        }

        case 'liquidity': {
          message = `# 💧 Liquidity Guide\n\nProviding liquidity means adding tokens to a pool to earn fees.\n\n## Format:\n\`Add [amount1] [token1] and [amount2] [token2] to liquidity pool\`\n\n## Benefits:\n- Earn trading fees\n- Support DeFi ecosystem\n- Liquidity mining rewards\n\n## Examples:`;
          examples = actionRegistry.getActionExamples(ActionType.LIQUIDITY);
          break;
        }

        default: {
          message = `# 🎓 DeFi Commands Guide\n\nWelcome to Tasmil AI! Here are the main features you can use:\n\n## 🔄 **Swapping**\nExchange tokens instantly\n\n## 🌉 **Bridging** \nTransfer tokens between blockchains\n\n## 💰 **Staking**\nEarn rewards by locking tokens\n\n## 💧 **Liquidity**\nProvide liquidity to earn fees\n\n## 💳 **Wallet**\nCheck your token balances\n\n## 📚 Get Specific Help:\n- "How to bridge tokens?"\n- "Show me staking examples"\n- "What is swapping?"\n- "Guide for liquidity pools"`;

          // Get examples from multiple actions
          const allExamples = actionRegistry.getAllExamples();
          examples = [
            ...(allExamples.swap?.slice(0, 2) || []),
            ...(allExamples.bridge?.slice(0, 2) || []),
            ...(allExamples.stake?.slice(0, 2) || []),
          ];
          break;
        }
      }

      if (examples.length > 0) {
        message +=
          '\n\n' +
          examples
            .map((example, index) => `${index + 1}. \`${example}\``)
            .join('\n');
      }

      message +=
        "\n\n💡 **Tip**: Just type your command naturally, and I'll help you execute it!";

      return this.createSuccessResult({
        message,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: { topic, examples },
      });
    } catch {
      return this.createErrorResult('Failed to provide help information');
    }
  }

  validateMissingParams(): string[] {
    // Help doesn't require specific parameters
    return [];
  }
}

export const helpAction = new HelpAction();
