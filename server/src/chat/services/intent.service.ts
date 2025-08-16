import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { Injectable } from '@nestjs/common';
import { LoggerService } from 'src/chat/services/logger.service';
import { clearResponse } from 'src/utils/function';
import { actionRegistry } from '../actions';
import { ActionType, DeFiIntent, ParamsType } from '../entities/intent.entity';

@Injectable()
export class IntentService {
  private model: ChatOpenAI;
  private readonly logger: LoggerService;

  constructor() {
    this.logger = new LoggerService('IntentService');
    this.initializeModel();
  }

  private initializeModel(): void {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is not defined');
    }

    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-4o-mini',
      temperature: 0,
    });
    this.logger.log('Intent model initialized');
  }

  private buildSystemPrompt(): string {
    const allActions = actionRegistry.getAllActions();
    const actionTypes = Object.keys(allActions).filter(
      (key) => key !== 'unknown',
    );

    const actionPrompts = actionTypes
      .map((actionType) => {
        const action = actionRegistry.getAction(actionType as ActionType);
        const examples =
          action.examples.length > 0
            ? `\nExamples: ${action.examples.join(', ')}`
            : '';
        return `${actionType}: ${action.prompt}${examples}`;
      })
      .join('\n\n');

    const allExamples = actionRegistry.getAllExamples();
    const exampleText = Object.entries(allExamples)
      .map(([type, examples]) => `${type}: ${examples.join(', ')}`)
      .join('\n');

    return `You are a DeFi intent parser. Extract the user's intent and parameters from their message.
            Analyze both the current message and previous context to determine missing fields.

            Available action types: ${actionTypes.join(', ')}, unknown

            Examples of each action type:
            ${exampleText}

            For each action type, extract parameters as follows:
            ${actionPrompts}

            Return a JSON object with the following structure:
            {
              "actionType": one of [${actionTypes.join(', ')}, "unknown"],
              "params": {
                // Parameters based on the intent type - use the exact structure from the prompts above
              },
              "confidence": number (0-1),
              "missingFields": string[],
              "context": string (brief explanation of what was understood and what's missing)
            }`;
  }

  async extractIntent(message: string): Promise<DeFiIntent> {
    try {
      const systemPrompt = this.buildSystemPrompt();

      const response = await this.model.invoke([
        new SystemMessage(systemPrompt),
        new HumanMessage(message),
      ]);

      const cleanContent = clearResponse(response.content as string);
      const intent = JSON.parse(cleanContent) as DeFiIntent;

      // return missing fields and context
      const validatedIntent = this.validateAndEnhanceIntent(intent);

      this.logger.log(`Extracted intent: ${JSON.stringify(validatedIntent)}`);
      return validatedIntent;
    } catch (error) {
      this.logger.error('Failed to extract intent', error);
      throw error;
    }
  }

  private validateAndEnhanceIntent(intent: DeFiIntent): DeFiIntent {
    const action = actionRegistry.getAction(intent.actionType);

    if (intent.actionType === ActionType.UNKNOWN || !action) {
      return {
        ...intent,
        actionType: ActionType.UNKNOWN,
        params: {} as ParamsType,
        missingFields: [],
        context: 'Invalid action type detected',
      };
    }

    const missingFields = actionRegistry.validateActionParams(
      intent.actionType,
      intent.params,
    );

    return {
      ...intent,
      missingFields,
      context: this.buildContext(intent, missingFields),
    };
  }

  private buildContext(intent: DeFiIntent, missingFields: string[]): string {
    const actionName =
      intent.actionType === ActionType.UNKNOWN
        ? 'unknown action'
        : intent.actionType;

    let context = `I understood you want to ${actionName}`;

    // Add confidence information
    if (intent.confidence < 0.5) {
      context += `, but I'm not confident about this interpretation`;
    } else if (intent.confidence < 0.7) {
      context += `, though I'm somewhat uncertain`;
    } else if (intent.confidence >= 0.9) {
      context += ` with high confidence`;
    }

    // Add missing fields information
    if (missingFields.length > 0) {
      const missingList = missingFields.join(', ');
      context += `. I need more information about: ${missingList}`;

      // Provide examples for the action type
      if (intent.actionType !== ActionType.UNKNOWN) {
        const examples = actionRegistry.getActionExamples(intent.actionType);
        if (examples.length > 0) {
          context += `. For example: "${examples[0]}"`;
        }
      }
    } else {
      context += ` and I have all the required information`;
    }

    return context;
  }
}
