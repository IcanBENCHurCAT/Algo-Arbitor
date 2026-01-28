# Building Agents with AlgoAgent

## Basic Agent

```typescript
import { AlgoAgent, WalletTool, MarketTool } from '@algoagent/core';

const agent = new AlgoAgent({
  name: 'basic-bot',
  model: 'gpt-4-turbo',
  tools: [
    new WalletTool({ mnemonic: process.env.AGENT_MNEMONIC }),
    new MarketTool()
  ],
  systemPrompt: 'You are a helpful Algorand assistant.'
});

const result = await agent.run({
  task: 'What is the ALGO/USDC price?',
  maxIterations: 5
});
```

## Built-In Tools

- **WalletTool** - Balance, sign transactions, address
- **MarketTool** - Prices, TVL, volume from DEXes
- **TransactionTool** - Build swaps, validate slippage
- **OracleTool** - Price feeds (VERA, Pyth)
- **AssetTool** - ASA management (opt-in, transfer)

## Middleware

```typescript
import { RateLimiter, CostController, HumanApproval } from '@algoagent/core';

const agent = new AlgoAgent({
  ...config,
  middleware: [
    new RateLimiter({ calls: 100, window: 60 }),
    new CostController({ maxSpendPerDay: 5.0 }),
    new HumanApproval({ highValueThreshold: 100 })
  ]
});
```

## State Persistence

```typescript
const result = await agent.run({ task: 'Complex task' });
const resumed = await agent.resume(result.executionId, { task: 'Continue' });
```