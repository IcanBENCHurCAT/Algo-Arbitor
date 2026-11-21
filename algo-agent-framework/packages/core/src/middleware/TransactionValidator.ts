import { Middleware, ToolResult, AlgoAgentError } from '../types';

export class TransactionValidator implements Middleware {
  constructor(private config: { whitelistReceivers?: string[]; maxTransactionAmount?: number; slippageLimit?: number } = {}) {}

  async beforeToolCall(toolName: string, input: any): Promise<void> {
    if (toolName === 'wallet_action' && input.action === 'sign_transaction' && input.transaction) {
      const txn = input.transaction;
      if (this.config.whitelistReceivers !== undefined) {
        if (
          typeof txn.receiver !== 'string' ||
          txn.receiver.length === 0 ||
          !this.config.whitelistReceivers.includes(txn.receiver)
        ) {
          throw new AlgoAgentError('Receiver not whitelisted', 'NOT_WHITELISTED');
        }
      }
      if (this.config.maxTransactionAmount !== undefined) {
        if (typeof txn.amount !== 'number' || !Number.isFinite(txn.amount) || txn.amount < 0) {
          throw new AlgoAgentError('Invalid transaction amount', 'INVALID_AMOUNT');
        }
        if (txn.amount > this.config.maxTransactionAmount) {
          throw new AlgoAgentError('Amount exceeded', 'AMOUNT_EXCEEDED');
        }
      }
    }
  }

  async afterToolCall(_result: ToolResult): Promise<void> {}
}