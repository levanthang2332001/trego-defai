// Export the action registry as the main interface
export { actionRegistry, ActionRegistry } from './registry/action.registry';

// Export types
export * from './types/action.interface';

// Export base classes for extensibility
export { AbstractBaseAction } from './base/base-action';

// Legacy compatibility - maintain existing interface
import { actionRegistry } from './registry/action.registry';
import { ActionType, ParamsType } from '../entities/intent.entity';
import { ChatResponse } from '../entities/chat.entity';

export const actionsMap = actionRegistry.getAllActions();

export function handleAction(
  actionType: ActionType,
  params: ParamsType,
  user_address: string,
): Promise<ChatResponse> {
  const action = actionRegistry.getAction(actionType);
  return action.handle(params, user_address);
}
