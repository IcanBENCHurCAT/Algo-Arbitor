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
});
