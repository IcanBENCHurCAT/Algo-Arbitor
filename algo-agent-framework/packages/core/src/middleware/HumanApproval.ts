import { Middleware, ToolResult, AlgoAgentError } from '../types';

export interface HumanApprovalConfig {
  /**
   * Minimum transaction amount (`>= highValueThreshold`) that requires human approval
   * on `wallet_action` `sign_transaction` calls. When omitted, all `sign_transaction`
   * calls invoke `onApprovalRequired` if configured.
   */
  highValueThreshold?: number;
  onApprovalRequired?: (d: any) => Promise<boolean>;
}

/**
 * Middleware that gates `wallet_action` `sign_transaction` calls on human approval.
 * When `highValueThreshold` is set, amounts `>= highValueThreshold` require approval
 * and throw `AlgoAgentError` with code `'APPROVAL_REQUIRED'` if `onApprovalRequired`
 * is omitted.
 */
export class HumanApproval implements Middleware {
  constructor(private config: HumanApprovalConfig = {}) {}

  async beforeToolCall(toolName: string, input: any): Promise<void> {
    if (toolName !== 'wallet_action' || input?.action !== 'sign_transaction') {
      return;
    }

    if (this.config.highValueThreshold !== undefined) {
      const rawAmount = input?.transaction?.amount;
      const amount =
        typeof rawAmount === 'number' && Number.isFinite(rawAmount) ? rawAmount : 0;

      if (amount < this.config.highValueThreshold) {
        return;
      }

      if (!this.config.onApprovalRequired) {
        throw new AlgoAgentError(
          `Transaction amount ${amount} meets or exceeds highValueThreshold (${this.config.highValueThreshold}) and requires approval`,
          'APPROVAL_REQUIRED',
        );
      }
    }

    if (this.config.onApprovalRequired) {
      const approved = await this.config.onApprovalRequired({ toolName, input });
      if (!approved) {
        throw new AlgoAgentError('User rejected', 'REJECTED');
      }
    }
  }

  async afterToolCall(_result: ToolResult): Promise<void> {}
}