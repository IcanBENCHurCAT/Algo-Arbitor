import { Middleware, ToolResult, AlgoAgentError } from '../types';

export class RateLimiter implements Middleware {
  private timestamps: number[] = [];
  constructor(private config: { calls: number; window: number }) {}

  async beforeToolCall(_toolName: string, _input: Record<string, any>): Promise<void> {
    const now = Date.now();
    this.timestamps = this.timestamps.filter(t => t > now - this.config.window * 1000);
    if (this.timestamps.length >= this.config.calls) {
      throw new AlgoAgentError('Rate limit exceeded', 'RATE_LIMIT');
    }
    this.timestamps.push(now);
  }

  async afterToolCall(_result: ToolResult): Promise<void> {}
}