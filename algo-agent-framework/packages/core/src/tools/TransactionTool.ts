import { BaseTool } from './BaseTool';
import { ToolResult } from '../types';

export class TransactionTool extends BaseTool {
  name = 'transaction_action';
  description = 'Build swaps, validate slippage';
  input_schema = {
    type: 'object',
    properties: {
      action: { type: 'string', enum: ['build_swap', 'validate_slippage'] },
      params: { type: 'object' }
    },
    required: ['action']
  };

  async execute(input: { action: string }): Promise<ToolResult> {
    return { status: 'success', data: { action: input.action } };
  }
}