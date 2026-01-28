import { AlgoAgent } from '../agent/AlgoAgent';
import { WalletTool } from '../tools/WalletTool';
import { MarketTool } from '../tools/MarketTool';

describe('AlgoAgent', () => {
  it('should create agent with valid config', () => {
    const agent = new AlgoAgent({
      name: 'test-agent',
      model: 'gpt-4-turbo',
      tools: [new WalletTool(), new MarketTool()],
      systemPrompt: 'You are a test agent.'
    });
    expect(agent).toBeDefined();
  });

  it('should run and return result', async () => {
    const agent = new AlgoAgent({
      name: 'test-agent',
      model: 'gpt-4-turbo',
      tools: [new WalletTool(), new MarketTool()],
      systemPrompt: 'You are a test agent.'
    });
    const result = await agent.run({ task: 'Test task' });
    expect(result.executionId).toBeDefined();
    expect(result.status).toBe('success');
  });

  it('rejects invalid config', () => {
    expect(() => new AlgoAgent({} as any)).toThrow('INVALID_CONFIG');
  });

  it('runs direct tool call successfully', async () => {
    const agent = new AlgoAgent({
      name: 'test-agent',
      model: 'gpt-4-turbo',
      tools: [new WalletTool({}), new MarketTool({})],
      systemPrompt: 'test'
    });

    const result = await agent.run({
      task: 'test',
      directToolCall: { toolName: 'wallet_action', input: { action: 'balance' } }
    });

    expect(result.status).toBe('success');
    expect(result.executionId).toBeDefined();
    expect(result.toolCalls).toHaveLength(1);
  });

  it('persists state when configured', async () => {
    // Mock StateStore implementation
    const mockStore: any = { states: [] };
    const agent = new AlgoAgent({
      name: 'test-agent',
      model: 'gpt-4-turbo',
      tools: [new WalletTool({})],
      systemPrompt: 'test',
      stateStore: {
        async save(state: any) { mockStore.states.push(state); },
        async load(id: string) { return mockStore.states.find((s: any) => s.id === id) || null; },
        async list() { return []; }
      }
    });

    const result = await agent.run({ task: 'test' });
    // @ts-ignore
    const loaded = await agent['config'].stateStore.load(result.executionId!);
    expect(loaded).toBeDefined();
  });
});
