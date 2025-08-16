# Actions System

This directory contains the DeFi actions system with an improved, scalable architecture.

## Structure

```
actions/
├── base/                    # Base classes and common functionality
│   └── base-action.ts      # Abstract base action class
├── types/                  # Type definitions and interfaces
│   └── action.interface.ts # Core action interfaces
├── registry/               # Action registration and management
│   └── action.registry.ts  # Central action registry
├── trading/                # Trading-related actions
│   └── swap.action.ts      # Token swap functionality
├── liquidity/              # Liquidity management actions
│   ├── add-liquidity.action.ts    # Add liquidity to pools
│   └── remove-liquidity.action.ts # Remove liquidity from pools
├── lending/                # Lending and borrowing actions
│   ├── borrow.action.ts    # Borrow tokens with collateral
│   └── lending.action.ts   # Supply tokens to earn interest
├── yield/                  # Yield farming and staking
│   └── staking.action.ts   # Token staking functionality
├── unknown/                # Default/fallback actions
│   └── default.action.ts   # Handle unknown intents
└── index.ts               # Main exports and legacy compatibility
```

## Key Features

### 1. Type Safety

- Formal `BaseAction` interface ensures consistency
- Generic type support for different parameter types
- Proper error handling with `ActionResult<T>`

### 2. Consistent Structure

- All actions extend `AbstractBaseAction`
- Standardized validation methods
- Built-in error handling utilities

### 3. Simple & Clean Interface

- Simplified action structure without complex metadata
- Direct examples property for better usability
- Focused on essential action properties (name, similar, prompt, examples)

### 4. Enhanced Action Registry

- Centralized management of all actions
- Easy access to examples and similar terms
- Built-in validation and analysis helpers
- Improved intent analysis with contextual examples

### 5. Extensibility

- Easy to add new action categories
- Pluggable architecture for new actions
- Validation helpers in base class

## Usage

### Basic Usage

```typescript
import { actionRegistry } from './actions';

// Get a specific action
const swapAction = actionRegistry.getAction('swap');

// Execute action
const result = swapAction.handle({
  fromToken: 'USDC',
  toToken: 'ETH',
  amount: 100,
});

// Validate parameters
const missingFields = actionRegistry.validateActionParams('swap', params);

// Get examples for better analysis
const examples = actionRegistry.getActionExamples('swap');

// Get all examples for training/analysis
const allExamples = actionRegistry.getAllExamples();
```

### Adding New Actions

1. Create action class extending `AbstractBaseAction`:

```typescript
export class MyAction extends AbstractBaseAction<MyParams> {
  readonly name = 'myAction';
  readonly similar = ['my', 'action'];
  readonly prompt = 'Extract parameters for my action...';
  readonly examples = ['Example usage 1', 'Example usage 2', 'Example usage 3'];

  handle(params: MyParams): ActionResult {
    // Implementation
  }

  validateMissingParams(params: Partial<MyParams>): string[] {
    // Validation logic
  }
}
```

2. Register in `action.registry.ts`:

```typescript
import { myAction } from '../myCategory/my.action';

// Add to actions map
private actions: ActionMap = {
  // ... existing actions
  myAction: myAction,
};
```

### Categories

- **trading**: Token swaps and exchanges
- **liquidity**: Pool management and liquidity provision (add/remove)
- **lending**: Borrowing and lending protocols (borrow/supply)
- **yield**: Staking, farming, and yield generation
- **system**: Default handlers and utilities

## Validation Helpers

The base class provides common validation methods:

- `validateRequired()`: Check for required fields
- `validateNumber()`: Validate positive numbers
- `validateString()`: Validate non-empty strings
- `createSuccessResult()`: Create success response
- `createErrorResult()`: Create error response

## Improved Intent Analysis

The intent service now provides better analysis with:

### Enhanced Context Building

- Confidence-based messaging (high/medium/low confidence)
- Contextual examples when missing fields are detected
- Clearer explanations of what information is needed

### Better AI Training Data

- All examples are included in the system prompt
- More comprehensive action descriptions
- Improved parameter extraction with real-world examples

### Registry Helper Methods

- `getActionExamples()`: Get examples for specific action
- `getAllExamples()`: Get all examples for analysis

## Migration from Old Structure

The new system maintains backward compatibility through the legacy exports in `index.ts`. Existing code using `actionsMap` and `handleAction` will continue to work without changes.
