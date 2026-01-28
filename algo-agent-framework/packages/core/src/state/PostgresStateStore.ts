import { StateStore, AgentState } from '../types';

export class PostgresStateStore implements StateStore {
  constructor(private config: { connectionString?: string } = {}) {}

  async save(state: AgentState): Promise<void> {
    console.log('Saving state:', state.id);
    // TODO: Implement PostgreSQL
  }

  async load(executionId: string): Promise<AgentState | null> {
    console.log('Loading:', executionId);
    return null;
  }

  async list(filter?: { name?: string; limit?: number }): Promise<AgentState[]> {
    console.log('Listing:', filter);
    return [];
  }
}