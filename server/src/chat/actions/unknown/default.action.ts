/* eslint-disable @typescript-eslint/require-await */
import { ChatResponse } from 'src/chat/entities/chat.entity';
import { ParamsType } from '../../entities/intent.entity';
import { AbstractBaseAction } from '../base/base-action';

export class DefaultAction extends AbstractBaseAction<ParamsType> {
  readonly name = 'unknown';
  readonly similar: string[] = [];
  readonly prompt = `Act as a DeFi expert and provide helpful guidance. If the requested action is not supported by the platform, explain it professionally and suggest alternatives.`;

  readonly examples: string[] = [];

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async handle(_params: ParamsType): Promise<ChatResponse> {
    return this.createSuccessResult({
      message:
        'As a DeFi expert, I can help you understand DeFi concepts, investment strategies, or guide you in using various protocols. However, the specific feature you requested may not be supported on this platform yet. Please describe what you want to do in more detail, or I can assist you with:\n\n• Swap tokens (APT, ALT)\n• Staking\n• Feel free to ask me about any aspect of DeFi!',
      data: {},
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validateMissingParams(_params: Partial<ParamsType>): string[] {
    // Unknown actions don't require specific parameters
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  validateParams(_params: ParamsType): boolean {
    // Unknown actions are always valid
    return true;
  }
}

export const defaultAction = new DefaultAction();
