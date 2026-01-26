import pino from 'pino';

export class Logger {
  private logger: pino.Logger;
  constructor(private agentName: string, config?: { level?: string; pretty?: boolean }) {
    this.logger = pino({ level: config?.level || 'info' });
  }

  info(msg: string, ctx?: Record<string, any>) { this.logger.info({ agent: this.agentName, ...ctx }, msg); }
  error(msg: string, ctx?: Record<string, any>) { this.logger.error({ agent: this.agentName, ...ctx }, msg); }
  warn(msg: string, ctx?: Record<string, any>) { this.logger.warn({ agent: this.agentName, ...ctx }, msg); }
  debug(msg: string, ctx?: Record<string, any>) { this.logger.debug({ agent: this.agentName, ...ctx }, msg); }
}