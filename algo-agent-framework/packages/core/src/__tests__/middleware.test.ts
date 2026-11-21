import { RateLimiter } from '../middleware/RateLimiter';
import { CostController } from '../middleware/CostController';
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
});
