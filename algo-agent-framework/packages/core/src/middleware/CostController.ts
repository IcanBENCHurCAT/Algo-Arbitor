import { Middleware, ToolResult, AlgoAgentError } from '../types';

export class CostController implements Middleware {
  private dailySpent = 0;
  constructor(private config: { maxSpendPerDay: number }) {}

  async beforeToolCall(toolName: string, input: any): Promise<void> {
    if (toolName === 'wallet_action' && input.action === 'sign_transaction') {
      if (this.dailySpent + 0.001 > this.config.maxSpendPerDay) {
        throw new AlgoAgentError('Daily limit exceeded', 'COST_LIMIT');
      }
    }
  }

  async afterToolCall(result: ToolResult): Promise<void> {
    if (result.cost) this.dailySpent += result.cost;
  }
}