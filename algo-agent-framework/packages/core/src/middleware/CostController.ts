import { Middleware, ToolResult, AlgoAgentError } from '../types';

export class CostController implements Middleware {
  private dailySpent = 0;
  constructor(private config: { maxSpendPerDay: number }) {}

  async beforeToolCall(toolName: string, input: any): Promise<void> {
    if (toolName === 'wallet_action' && input.action === 'sign_transaction') {
      const amount = input.transaction?.amount || 0;
      // Assume basic fee of 0.001 plus the transaction amount
      const cost = 0.001 + amount;
      if (this.dailySpent + cost > this.config.maxSpendPerDay) {
        throw new AlgoAgentError('Daily limit exceeded', 'COST_LIMIT');
      }
    }
  }

  async afterToolCall(result: ToolResult): Promise<void> {
    if (result.cost) this.dailySpent += result.cost;
  }
}