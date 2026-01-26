import { v4 as uuid } from 'uuid';
import { AlgoAgentConfig, AgentExecutionResult, AgentState, AlgoAgentError } from '../types';
import { Logger } from '../observability/Logger';

export class AlgoAgent {
  private config: AlgoAgentConfig;
  private logger: Logger;
  private state: AgentState | null = null;

  constructor(config: AlgoAgentConfig) {
    this.config = config;
    this.logger = new Logger(config.name);
    if (!config.name || !config.model || !config.tools?.length || !config.systemPrompt) {
      throw new AlgoAgentError('Invalid config', 'INVALID_CONFIG');
    }
  }

  async run(options: { task: string; maxIterations?: number; timeout?: number }): Promise<AgentExecutionResult> {
    const startTime = Date.now();
    const executionId = uuid();

    this.logger.info('Agent starting', { executionId, task: options.task });

    this.state = {
      id: executionId,
      name: this.config.name,
      messages: [{ role: 'user', content: options.task }],
      toolCalls: [],
      status: 'running',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    // TODO: Implement LangChain agent loop
    const answer = 'Agent loop not yet implemented - see docs/agents.md';

    if (this.config.stateStore) {
      this.state.status = 'completed';
      await this.config.stateStore.save(this.state);
    }

    return {
      executionId,
      status: 'success',
      answer,
      toolCalls: this.state.toolCalls,
      transactions: [],
      totalCost: 0,
      duration: Date.now() - startTime,
      timestamp: Date.now()
    };
  }

  async resume(executionId: string, options: { task: string }): Promise<AgentExecutionResult> {
    if (!this.config.stateStore) throw new AlgoAgentError('No state store', 'NO_STATE_STORE');
    const state = await this.config.stateStore.load(executionId);
    if (!state) throw new AlgoAgentError('State not found', 'NOT_FOUND');
    this.state = state;
    return this.run(options);
  }

  async getMetrics() {
    return { executions: 0, successRate: 0, avgDuration: 0, toolCalls: {}, cost: { fees: 0 } };
  }
}