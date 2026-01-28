import { v4 as uuid } from 'uuid';
import { AlgoAgentConfig, AgentExecutionResult, AgentState, AlgoAgentError, ToolResult, ExecutionOptions } from '../types';
import { Logger } from '../observability/Logger';
import { ModelFactory } from './ModelFactory';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';

export class AlgoAgent {
  private config: AlgoAgentConfig;
  private logger: Logger;
  private state: AgentState | null = null;
  private model: BaseChatModel;

  constructor(config: AlgoAgentConfig) {
    this.config = config;
    this.logger = new Logger(config.name);

    // Resolve model name
    const modelName = config.model || process.env.AGENT_MODEL;
    if (!config.name || !modelName || !config.tools?.length || !config.systemPrompt) {
      throw new AlgoAgentError('INVALID_CONFIG', 'INVALID_CONFIG');
    }

    // Validate that we can create the model
    this.model = ModelFactory.create(modelName);
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

    let answer: string;

    if (options.directToolCall) {
      // Direct tool call for testing
      const result = await this.callTool(options.directToolCall.toolName, options.directToolCall.input);
      answer = JSON.stringify({ toolResult: result }, null, 2);
    } else {
      // TODO: LangChain integration
      answer = 'LangChain integration pending';
    }

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