import { RateLimiter } from '../middleware/RateLimiter';
import { CostController } from '../middleware/CostController';
import { HumanApproval } from '../middleware/HumanApproval';
import { TransactionValidator } from '../middleware/TransactionValidator';
import { AlgoAgentError } from '../types';

const makeSignTxnInput = (transaction: Record<string, unknown>) => ({
  action: 'sign_transaction',
  transaction,
});

describe('Middleware', () => {
  it('RateLimiter blocks after limit', async () => {
    const limiter = new RateLimiter({ calls: 2, window: 60 });
    await limiter.beforeToolCall('test', {});
    await limiter.beforeToolCall('test', {});
    await expect(limiter.beforeToolCall('test', {})).rejects.toThrow('Rate limit');
  });

  it('CostController blocks expensive transactions', async () => {
    const controller = new CostController({ maxSpendPerDay: 0.001 });
    await expect(
      controller.beforeToolCall('wallet_action', {
        action: 'sign_transaction',
        transaction: { amount: 10 },
      }),
    ).rejects.toThrow('Daily limit');
  });

  describe('TransactionValidator', () => {
    it('allows whitelisted receiver and rejects unlisted, missing, or empty receivers with NOT_WHITELISTED', async () => {
      const validator = new TransactionValidator({ whitelistReceivers: ['ALGO_ADDR_1'] });

      await expect(
        validator.beforeToolCall('wallet_action', makeSignTxnInput({ receiver: 'ALGO_ADDR_1', amount: 1 })),
      ).resolves.toBeUndefined();

      for (const receiver of ['ALGO_ADDR_2', undefined, '']) {
        const call = validator.beforeToolCall('wallet_action', makeSignTxnInput({ receiver, amount: 1 }));
        await expect(call).rejects.toThrow(AlgoAgentError);
        await expect(call).rejects.toMatchObject({ code: 'NOT_WHITELISTED' });
      }
    });

    it('enforces maxTransactionAmount: 0 by allowing 0 and rejecting > 0 with AMOUNT_EXCEEDED', async () => {
      const validator = new TransactionValidator({ maxTransactionAmount: 0 });

      await expect(
        validator.beforeToolCall('wallet_action', makeSignTxnInput({ amount: 0 })),
      ).resolves.toBeUndefined();

      const overZero = validator.beforeToolCall('wallet_action', makeSignTxnInput({ amount: 0.0001 }));
      await expect(overZero).rejects.toThrow(AlgoAgentError);
      await expect(overZero).rejects.toMatchObject({ code: 'AMOUNT_EXCEEDED' });
    });

    it('rejects negative, NaN, and Infinity amounts with INVALID_AMOUNT', async () => {
      const validator = new TransactionValidator({ maxTransactionAmount: 100 });

      for (const amount of [-1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
        const call = validator.beforeToolCall('wallet_action', makeSignTxnInput({ amount }));
        await expect(call).rejects.toThrow(AlgoAgentError);
        await expect(call).rejects.toMatchObject({ code: 'INVALID_AMOUNT' });
      }
    });

    it('allows exact boundary amount === maxTransactionAmount and rejects amount > maxTransactionAmount', async () => {
      const validator = new TransactionValidator({ maxTransactionAmount: 50 });

      await expect(
        validator.beforeToolCall('wallet_action', makeSignTxnInput({ amount: 50 })),
      ).resolves.toBeUndefined();

      const overLimit = validator.beforeToolCall('wallet_action', makeSignTxnInput({ amount: 50.01 }));
      await expect(overLimit).rejects.toThrow(AlgoAgentError);
      await expect(overLimit).rejects.toMatchObject({ code: 'AMOUNT_EXCEEDED' });
    });
  });

  describe('HumanApproval', () => {
    it('passes through below-threshold transactions without invoking onApprovalRequired', async () => {
      const onApprovalRequired = jest.fn().mockResolvedValue(false);
      const approval = new HumanApproval({ highValueThreshold: 100, onApprovalRequired });

      await expect(
        approval.beforeToolCall('wallet_action', makeSignTxnInput({ amount: 99.99 })),
      ).resolves.toBeUndefined();
      await expect(
        approval.beforeToolCall('wallet_action', makeSignTxnInput({})),
      ).resolves.toBeUndefined();
      expect(onApprovalRequired).not.toHaveBeenCalled();
    });

    it('prompts onApprovalRequired at exact and above highValueThreshold and throws REJECTED when denied', async () => {
      const onApprovalRequired = jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      const approval = new HumanApproval({ highValueThreshold: 100, onApprovalRequired });

      const exactInput = makeSignTxnInput({ amount: 100 });
      await expect(approval.beforeToolCall('wallet_action', exactInput)).resolves.toBeUndefined();
      expect(onApprovalRequired).toHaveBeenNthCalledWith(1, {
        toolName: 'wallet_action',
        input: exactInput,
      });

      const aboveInput = makeSignTxnInput({ amount: 150 });
      const rejectedCall = approval.beforeToolCall('wallet_action', aboveInput);
      await expect(rejectedCall).rejects.toThrow(AlgoAgentError);
      await expect(rejectedCall).rejects.toMatchObject({ code: 'REJECTED' });
      expect(onApprovalRequired).toHaveBeenNthCalledWith(2, {
        toolName: 'wallet_action',
        input: aboveInput,
      });
    });

    it('throws APPROVAL_REQUIRED at or above highValueThreshold when onApprovalRequired is omitted', async () => {
      const approval = new HumanApproval({ highValueThreshold: 100 });

      for (const amount of [100, 250]) {
        const call = approval.beforeToolCall('wallet_action', makeSignTxnInput({ amount }));
        await expect(call).rejects.toThrow(AlgoAgentError);
        await expect(call).rejects.toMatchObject({ code: 'APPROVAL_REQUIRED' });
      }
    });

    it('prompts on sign_transaction when highValueThreshold is omitted and ignores non-sign_transaction calls', async () => {
      const onApprovalRequired = jest.fn().mockResolvedValue(true);
      const approval = new HumanApproval({ onApprovalRequired });

      await expect(
        approval.beforeToolCall('wallet_action', { action: 'get_balance' }),
      ).resolves.toBeUndefined();
      await expect(
        approval.beforeToolCall('market_action', makeSignTxnInput({ amount: 500 })),
      ).resolves.toBeUndefined();
      expect(onApprovalRequired).not.toHaveBeenCalled();

      const signInput = makeSignTxnInput({ amount: 1 });
      await expect(approval.beforeToolCall('wallet_action', signInput)).resolves.toBeUndefined();
      expect(onApprovalRequired).toHaveBeenCalledTimes(1);
      expect(onApprovalRequired).toHaveBeenCalledWith({
        toolName: 'wallet_action',
        input: signInput,
      });
    });
  });
});
