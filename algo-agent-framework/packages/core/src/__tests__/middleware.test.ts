import { RateLimiter } from '../middleware/RateLimiter';
import { CostController } from '../middleware/CostController';

describe('Middleware', () => {
  it('RateLimiter blocks after limit', async () => {
    const limiter = new RateLimiter({ calls: 2, window: 60 });
    await limiter.beforeToolCall('test', {});
    await limiter.beforeToolCall('test', {});
    await expect(limiter.beforeToolCall('test', {})).rejects.toThrow('Rate limit');
  });

  it('CostController blocks expensive transactions', async () => {
    const controller = new CostController({ maxSpendPerDay: 0.001 });
    await expect(controller.beforeToolCall('wallet_action', {
      action: 'sign_transaction',
      transaction: { amount: 10 }
    })).rejects.toThrow('Daily limit');
  });
});
