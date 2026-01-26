# Contributing to AlgoAgent Framework

## Development Setup

```bash
git clone https://github.com/your-org/algo-agent-framework.git
cd algo-agent-framework
pnpm install
docker compose up -d
pnpm build
pnpm test
```

## Project Structure

```
packages/
├── core/              # Main framework
│   ├── src/
│   │   ├── agent/     # AlgoAgent class
│   │   ├── tools/     # Built-in tools
│   │   ├── middleware/
│   │   ├── state/
│   │   └── observability/
│   └── tests/
└── examples/          # Example agents
```

## Workflow

1. Create branch: `git checkout -b feature/my-feature`
2. Make changes (TypeScript strict, ESLint + Prettier)
3. Test: `pnpm test`
4. Commit: `git commit -m "feat(tools): add feature"`
5. Push and create PR

## Adding Tools

```typescript
import { BaseTool, ToolResult } from './BaseTool';

export class MyTool extends BaseTool {
  name = 'my_tool';
  description = 'What it does';
  input_schema = { type: 'object', properties: {...}, required: [...] };

  async execute(input: any): Promise<ToolResult> {
    return { status: 'success', data: {...} };
  }
}
```

## Adding Middleware

```typescript
import { Middleware, ToolResult } from '../types';

export class MyMiddleware implements Middleware {
  async beforeToolCall(toolName: string, input: any): Promise<void> {}
  async afterToolCall(result: ToolResult): Promise<void> {}
}
```