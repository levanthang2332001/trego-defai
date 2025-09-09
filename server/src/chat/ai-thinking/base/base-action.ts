import { ChatResponse } from 'src/chat/entities/chat.entity';
import { ParamsType } from 'src/chat/entities/intent.entity';
import { BaseAction } from '../types/action.interface';

export abstract class AbstractBaseAction implements BaseAction {
  abstract readonly name: string;
  abstract readonly similar: string[];
  abstract readonly prompt: string;
  abstract readonly examples: string[];

  abstract handle(params: any, user_address: string): Promise<ChatResponse>;
  abstract validateMissingParams(params: Partial<ParamsType>): string[];

  protected validateRequired(value: any, fieldName: string): string | null {
    if (value === undefined || value === null || value === '') {
      return fieldName;
    }
    return null;
  }

  protected validateNumber(value: any, fieldName: string): string | null {
    if (typeof value !== 'number' || isNaN(value) || value <= 0) {
      return fieldName;
    }
    return null;
  }

  protected validateNumberOrMax(value: any, fieldName: string): string | null {
    if (
      value !== 'max' &&
      (typeof value !== 'number' || isNaN(value) || value <= 0)
    ) {
      return fieldName;
    }
    return null;
  }

  protected validateString(value: any, fieldName: string): string | null {
    if (typeof value !== 'string' || value.trim() === '') {
      return fieldName;
    }
    return null;
  }

  protected createSuccessResult<T>({
    message,
    data,
  }: {
    message: string;
    data: T;
  }): ChatResponse {
    return {
      message,
      success: true,
      data,
    };
  }

  protected createErrorResult(error: string = 'Action failed'): ChatResponse {
    return {
      message: error,
      success: false,
    };
  }

  validateParams?(params: ParamsType): boolean {
    const missingFields = this.validateMissingParams(params);
    return missingFields.length === 0;
  }
}
