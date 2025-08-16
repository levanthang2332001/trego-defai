import { BaseAction } from '../types/action.interface';
import { ParamsType } from '../../entities/intent.entity';
import { ChatResponse } from 'src/chat/entities/chat.entity';

export abstract class AbstractBaseAction<
  TParams extends ParamsType = ParamsType,
> implements BaseAction<TParams>
{
  abstract readonly name: string;
  abstract readonly similar: string[];
  abstract readonly prompt: string;
  abstract readonly examples: string[];

  abstract handle(params: TParams, user_address: string): Promise<ChatResponse>;
  abstract validateMissingParams(params: Partial<TParams>): string[];

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

  validateParams?(params: TParams): boolean {
    const missingFields = this.validateMissingParams(params);
    return missingFields.length === 0;
  }
}
