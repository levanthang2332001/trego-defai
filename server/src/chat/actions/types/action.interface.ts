import { ChatResponse } from 'src/chat/entities/chat.entity';
import { ParamsType } from '../../entities/intent.entity';

export interface BaseAction<TParams extends ParamsType = ParamsType> {
  readonly name: string;
  readonly similar: string[];
  readonly prompt: string;
  readonly examples: string[];

  handle(params: TParams, user_address: string): Promise<ChatResponse>;
  validateMissingParams(params: Partial<TParams>): string[];
  validateParams?(params: TParams): boolean;
}

export type ActionMap = Record<string, BaseAction>;
