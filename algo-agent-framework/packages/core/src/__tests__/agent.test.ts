import { AlgoAgent } from '../agent/AlgoAgent';
import { WalletTool } from '../tools/WalletTool';
import { MarketTool } from '../tools/MarketTool';
import { AgentState, AlgoAgentError, BaseTool, StateStore } from '../types';
import algosdk from 'algosdk';

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
    // @ts-expect-error accessing private config for test verification
    const loaded = await agent['config'].stateStore.load(result.executionId!);
    expect(loaded).toBeDefined();
  });

  it('returns string address from WalletTool under algosdk v3', async () => {
    const acct = algosdk.generateAccount();
    const mnemonic = algosdk.secretKeyToMnemonic(acct.sk);
    const tool = new WalletTool({ mnemonic });
    const res = await tool.execute({ action: 'address' });

    expect(res.status).toBe('success');
    expect(typeof res.data.address).toBe('string');
    expect(res.data.address).toBe(acct.addr.toString());
  });

  describe('resume and totalCost', () => {
    const createMemoryStore = (initialStates: AgentState[] = []): StateStore => {
      const store = new Map<string, AgentState>(initialStates.map(s => [s.id, s]));
      return {
        async save(state: AgentState) {
          store.set(state.id, state);
        },
        async load(executionId: string) {
          return store.get(executionId) ?? null;
        },
        async list() {
          return Array.from(store.values());
        }
      };
    };

    const createCostTool = (name: string, cost?: number): BaseTool => ({
      name,
      description: 'Test tool with configurable cost',
      input_schema: {},
      async execute(input: Record<string, unknown>) {
        return {
          status: 'success',
          data: { input },
          ...(cost !== undefined ? { cost } : {})
        };
      }
    });

    it('resume() throws NO_STATE_STORE when no stateStore is configured', async () => {
      const agent = new AlgoAgent({
        name: 'test-agent',
        model: 'gpt-4-turbo',
        tools: [new WalletTool({})],
        systemPrompt: 'test'
      });

      await expect(agent.resume('exec-123', { task: 'continue' })).rejects.toThrow(
        AlgoAgentError
      );
      await expect(agent.resume('exec-123', { task: 'continue' })).rejects.toMatchObject({
        code: 'NO_STATE_STORE',
        message: 'No state store'
      });
    });

    it('resume() throws NOT_FOUND when executionId does not exist in stateStore', async () => {
      const agent = new AlgoAgent({
        name: 'test-agent',
        model: 'gpt-4-turbo',
        tools: [new WalletTool({})],
        systemPrompt: 'test',
        stateStore: createMemoryStore()
      });

      await expect(agent.resume('missing-id', { task: 'continue' })).rejects.toThrow(
        AlgoAgentError
      );
      await expect(agent.resume('missing-id', { task: 'continue' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: 'State not found'
      });
    });

    it('resume() preserves loaded executionId, prior messages, prior toolCalls, and updates updatedAt', async () => {
      const priorUpdatedAt = 1000;
      const priorState: AgentState = {
        id: 'exec-preserved-1',
        name: 'test-agent',
        messages: [
          { role: 'user', content: 'first task' },
          { role: 'assistant', content: 'first response' }
        ],
        toolCalls: [
          {
            toolName: 'prior_tool',
            input: { step: 1 },
            output: { status: 'success', data: { ok: true }, cost: 0.001 },
            duration: 12,
            timestamp: 900
          }
        ],
        status: 'completed',
        createdAt: 500,
        updatedAt: priorUpdatedAt
      };
      const store = createMemoryStore([priorState]);
      const agent = new AlgoAgent({
        name: 'test-agent',
        model: 'gpt-4-turbo',
        tools: [createCostTool('next_tool', 0.002)],
        systemPrompt: 'test',
        stateStore: store
      });

      const result = await agent.resume('exec-preserved-1', {
        task: 'follow-up task',
        directToolCall: { toolName: 'next_tool', input: { step: 2 } }
      });

      expect(result.executionId).toBe('exec-preserved-1');
      expect(result.status).toBe('success');
      expect(result.toolCalls).toHaveLength(2);
      expect(result.toolCalls[0].toolName).toBe('prior_tool');
      expect(result.toolCalls[1].toolName).toBe('next_tool');

      const saved = await store.load('exec-preserved-1');
      expect(saved).not.toBeNull();
      expect(saved!.id).toBe('exec-preserved-1');
      expect(saved!.createdAt).toBe(500);
      expect(saved!.status).toBe('completed');
      expect(saved!.updatedAt).toBeGreaterThan(priorUpdatedAt);
      expect(saved!.messages).toEqual([
        { role: 'user', content: 'first task' },
        { role: 'assistant', content: 'first response' },
        { role: 'user', content: 'follow-up task' }
      ]);
      expect(saved!.toolCalls).toHaveLength(2);
    });

    it('computes totalCost dynamically over toolCalls including missing/undefined cost', async () => {
      const priorState: AgentState = {
        id: 'exec-cost-1',
        name: 'test-agent',
        messages: [{ role: 'user', content: 'initial task' }],
        toolCalls: [
          {
            toolName: 'paid_tool_1',
            input: {},
            output: { status: 'success', data: {}, cost: 0.0015 },
            duration: 5,
            timestamp: 100
          },
          {
            toolName: 'free_tool',
            input: {},
            output: { status: 'success', data: {} },
            duration: 5,
            timestamp: 200
          }
        ],
        status: 'completed',
        createdAt: 50,
        updatedAt: 250
      };
      const store = createMemoryStore([priorState]);
      const agent = new AlgoAgent({
        name: 'test-agent',
        model: 'gpt-4-turbo',
        tools: [createCostTool('paid_tool_2', 0.0025), createCostTool('no_cost_tool')],
        systemPrompt: 'test',
        stateStore: store
      });

      const resumedResult = await agent.resume('exec-cost-1', {
        task: 'add another tool call',
        directToolCall: { toolName: 'paid_tool_2', input: {} }
      });

      expect(resumedResult.toolCalls).toHaveLength(3);
      expect(resumedResult.totalCost).toBeCloseTo(0.004, 10);

      const noCostResult = await agent.run({
        task: 'run tool with undefined cost',
        directToolCall: { toolName: 'no_cost_tool', input: {} }
      });
      expect(noCostResult.totalCost).toBe(0);
    });
  });
});
