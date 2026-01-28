export interface AlgoAgentConfig {
  name: string;
  model?: string; // Optional, can be inferred from env
  tools: BaseTool[];
  systemPrompt: string;
  middleware?: Middleware[];
  network?: 'mainnet' | 'testnet' | 'local';
  stateStore?: StateStore;
}

export interface ExecutionOptions {
  task: string;
  maxIterations?: number;
  timeout?: number;
  dryRun?: boolean;
  directToolCall?: { toolName: string; input: Record<string, any> }; // TEMP for testing
}

export interface BaseTool {
  name: string;
  description: string;
  input_schema: Record<string, any>;
  execute(input: Record<string, any>): Promise<ToolResult>;
}

export interface ToolResult {
  status: 'success' | 'error';
  data?: any;
  error?: string;
  executionTime?: number;
  cost?: number;
}

export interface Middleware {
  beforeToolCall?(toolName: string, input: Record<string, any>): Promise<void>;
  afterToolCall?(result: ToolResult): Promise<void>;
}

export interface AgentExecutionResult {
  executionId: string;
  status: 'success' | 'failed';
  answer: string;
  toolCalls: ToolCall[];
  transactions: TransactionRecord[];
  totalCost: number;
  duration: number;
  timestamp: number;
}

export interface ToolCall {
  toolName: string;
  input: Record<string, any>;
  output: ToolResult;
  duration: number;
  timestamp: number;
}

export interface TransactionRecord {
  txid: string;
  type: string;
  from: string;
  to: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'failed';
}

export interface AgentState {
  id: string;
  name: string;
  messages: Message[];
  toolCalls: ToolCall[];
  status: 'running' | 'completed' | 'failed';
  createdAt: number;
  updatedAt: number;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StateStore {
  save(state: AgentState): Promise<void>;
  load(executionId: string): Promise<AgentState | null>;
  list(filter?: { name?: string; limit?: number }): Promise<AgentState[]>;
}

export class AlgoAgentError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AlgoAgentError';
  }
}