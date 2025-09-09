import { ChatResponse } from 'src/chat/entities/chat.entity';
import { ParamsType } from 'src/chat/entities/intent.entity';

export interface BaseAction {
  readonly name: string;
  readonly similar: string[];
  readonly prompt: string;
  readonly examples: string[];

  handle(params: any, user_address: string): Promise<ChatResponse>;
  validateMissingParams(params: Partial<ParamsType>): string[];
  validateParams?(params: ParamsType): boolean;
}

export type ActionMap = Record<string, BaseAction>;
