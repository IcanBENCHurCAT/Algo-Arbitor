import { v4 as uuid } from 'uuid';
import { AlgoAgentConfig, AgentExecutionResult, AgentState, AlgoAgentError, ToolResult, ExecutionOptions } from '../types';
import { Logger } from '../observability/Logger';

export class AlgoAgent {
  private config: AlgoAgentConfig;
  private logger: Logger;
  private state: AgentState | null = null;

  constructor(config: AlgoAgentConfig) {
    this.config = config;
    this.logger = new Logger(config.name);
    if (!config.name || !config.model || !config.tools?.length || !config.systemPrompt) {
      throw new AlgoAgentError('INVALID_CONFIG', 'INVALID_CONFIG');
    }
  }

  private async callTool(
    toolName: string,
    input: Record<string, any>
  ): Promise<ToolResult> {
    const tool = this.config.tools.find(t => t.name === toolName);
    if (!tool) throw new AlgoAgentError(`Tool ${toolName} not found`, 'TOOL_NOT_FOUND');

    // Run before middleware
    for (const middleware of this.config.middleware || []) {
      if (middleware.beforeToolCall) {
        await middleware.beforeToolCall(toolName, input);
      }
    }

    const startTime = Date.now();
    const result = await tool.execute(input);
    result.executionTime = Date.now() - startTime;

    // Run after middleware
    for (const middleware of this.config.middleware || []) {
      if (middleware.afterToolCall) {
        await middleware.afterToolCall(result);
      }
    }

    // Record tool call
    this.state!.toolCalls.push({
      toolName,
      input,
      output: result,
      duration: result.executionTime!,
      timestamp: Date.now()
    });

    return result;
  }

  private async execute(
    options: ExecutionOptions,
    startTime: number
  ): Promise<AgentExecutionResult> {
    if (!this.state) {
      throw new AlgoAgentError('No active state', 'NO_ACTIVE_STATE');
    }

    let answer: string;

    if (options.directToolCall) {
      // Direct tool call for testing
      const result = await this.callTool(
        options.directToolCall.toolName,
        options.directToolCall.input
      );
      answer = JSON.stringify({ toolResult: result }, null, 2);
    } else {
      // TODO: LangChain integration
      answer = 'LangChain integration pending';
    }

    this.state.updatedAt = Date.now();
    this.state.status = 'completed';

    if (this.config.stateStore) {
      await this.config.stateStore.save(this.state);
    }

    const totalCost = this.state.toolCalls.reduce(
      (sum, tc) => sum + (tc.output?.cost ?? 0),
      0
    );

    return {
      executionId: this.state.id,
      status: 'success',
      answer,
      toolCalls: this.state.toolCalls,
      transactions: [],
      totalCost,
      duration: Date.now() - startTime,
      timestamp: Date.now()
    };
  }

  async run(options: ExecutionOptions): Promise<AgentExecutionResult> {
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

    return this.execute(options, startTime);
  }

  async resume(
    executionId: string,
    options: ExecutionOptions
  ): Promise<AgentExecutionResult> {
    if (!this.config.stateStore) {
      throw new AlgoAgentError('No state store', 'NO_STATE_STORE');
    }
    const state = await this.config.stateStore.load(executionId);
    if (!state) {
      throw new AlgoAgentError('State not found', 'NOT_FOUND');
    }

    const startTime = Date.now();
    this.logger.info('Agent resuming', { executionId, task: options.task });

    this.state = {
      ...state,
      messages: [...state.messages, { role: 'user', content: options.task }],
      toolCalls: [...state.toolCalls],
      status: 'running',
      updatedAt: Date.now()
    };

    return this.execute(options, startTime);
  }

  async getMetrics() {
    return { executions: 0, successRate: 0, avgDuration: 0, toolCalls: {}, cost: { fees: 0 } };
  }
}