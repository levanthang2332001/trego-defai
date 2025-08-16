import { BaseAction, ActionMap } from '../types/action.interface';
import { ParamsType, ActionType } from '../../entities/intent.entity';

// Import all actions
import { swapAction } from '../trading/swap.action';
import { liquidityAction } from '../liquidity/add-liquidity.action';
import { removeLiquidityAction } from '../liquidity/remove-liquidity.action';
import { stakingAction } from '../stake/staking.action';
import { borrowAction } from '../lending/borrow.action';
import { supplyAction } from '../lending/supply.action';
import { repayAction } from '../lending/repay.action';
import { withdrawAction } from '../lending/withdraw.action';
import { defaultAction } from '../unknown/default.action';
import { ustakingAction } from '../stake/unstaking.action';
import { claimRewardAction } from '../stake/claim-reward.action';
import { placeLimitOrderAction } from '../trading/place-limit-order.action';
import { placeMarketOrderAction } from '../trading/place-market-order.action';
import { walletAction } from '../wallet/wallet.action';
import { bridgeStargateAction } from '../stargate/bridge';
import { helpAction } from '../unknown/help.action';

export class ActionRegistry {
  private actions: ActionMap = {
    wallet: walletAction,
    swap: swapAction,
    bridge: bridgeStargateAction,
    liquidity: liquidityAction,
    remove_liquidity: removeLiquidityAction,
    stake: stakingAction,
    unstake: ustakingAction,
    borrow: borrowAction,
    supply: supplyAction,
    repay: repayAction,
    withdraw: withdrawAction,
    claim_reward: claimRewardAction,
    place_limit_order: placeLimitOrderAction,
    place_market_order: placeMarketOrderAction,
    help: helpAction,
    unknown: defaultAction,
  };

  getAction(actionType: ActionType): BaseAction {
    return this.actions[actionType] || this.actions.unknown;
  }

  getAllActions(): ActionMap {
    return { ...this.actions };
  }

  validateActionParams(actionType: ActionType, params: ParamsType): string[] {
    const action = this.getAction(actionType);
    return action.validateMissingParams(params);
  }

  getActionExamples(actionType: ActionType): string[] {
    const action = this.getAction(actionType);
    return action.examples;
  }

  getAllExamples(): Record<string, string[]> {
    const examples: Record<string, string[]> = {};
    Object.entries(this.actions).forEach(([actionType, action]) => {
      if (actionType !== 'unknown') {
        examples[actionType] = action.examples;
      }
    });
    return examples;
  }
}

export const actionRegistry = new ActionRegistry();
