import { Middleware, ToolResult, AlgoAgentError } from '../types';

export class HumanApproval implements Middleware {
  constructor(private config: { highValueThreshold?: number; onApprovalRequired?: (d: any) => Promise<boolean> } = {}) {}

  async beforeToolCall(toolName: string, input: any): Promise<void> {
    if (toolName === 'wallet_action' && input.action === 'sign_transaction') {
      if (this.config.onApprovalRequired) {
        const approved = await this.config.onApprovalRequired({ toolName, input });
        if (!approved) throw new AlgoAgentError('User rejected', 'REJECTED');
      }
    }
  }

  async afterToolCall(_result: ToolResult): Promise<void> {}
}