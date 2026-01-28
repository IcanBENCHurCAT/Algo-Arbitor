# AlgoAgent Framework

**Production-ready AI agents for Algorand DeFi.** Build autonomous agents that trade, farm yield, and execute complex strategies on Algorand with human oversight and cost controls.

## Features

- 🤖 **LLM-Powered Agents** – GPT-4, Claude, or local LLMs via LangChain
- 💼 **Modular Tools** – Pluggable wallet, market, transaction, and oracle tools
- 🔐 **Enterprise Security** – Transaction validation, slippage checks, cost controls
- 📊 **Vector DB Integration** – Find similar market conditions
- 🔍 **Full Observability** – LangSmith traces, Prometheus metrics, structured logging
- 🛡️ **Human-in-the-Loop** – Approve high-value transactions before execution
- 📈 **State Persistence** – Resume agents from interruption
- 🚀 **Production Ready** – Docker, Kubernetes included

## Quick Start

```bash
git clone https://github.com/your-org/algo-agent-framework.git
cd algo-agent-framework
pnpm install
docker compose up -d
pnpm build
```

### Your First Agent

```typescript
import { AlgoAgent, WalletTool, MarketTool } from '@algoagent/core';

const agent = new AlgoAgent({
  name: 'swap-bot',
  model: 'gpt-4-turbo',
  tools: [
    new WalletTool({ mnemonic: process.env.AGENT_MNEMONIC }),
    new MarketTool({ sources: ['tinyman', 'pact'] })
  ],
  systemPrompt: `You are a DeFi trading agent.
    Check market conditions and execute swaps when profitable.
    Always validate slippage < 1% before signing.`
});

const result = await agent.run({
  task: 'Swap 10 ALGO to USDC if price < $0.15',
  timeout: 30000
});
```

## Documentation

- [Building Agents](./docs/agents.md)
- [Contributing](./CONTRIBUTING.md)

## Project Structure

```
algo-agent-framework/
├── packages/
│   ├── core/           # Main framework
│   │   ├── src/
│   │   │   ├── agent/      # AlgoAgent class
│   │   │   ├── tools/      # Built-in tools
│   │   │   ├── middleware/ # Rate limiting, validation
│   │   │   ├── state/      # Persistence layer
│   │   │   └── observability/
│   │   └── tests/
│   └── examples/       # Example agents
├── docs/               # Documentation
└── docker-compose.yml
```

## License

MIT