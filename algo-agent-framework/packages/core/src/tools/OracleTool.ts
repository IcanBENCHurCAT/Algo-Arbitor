import { BaseTool } from './BaseTool';
import { ToolResult } from '../types';

export class OracleTool extends BaseTool {
  name = 'oracle_query';
  description = 'Query price feeds';
  input_schema = {
    type: 'object',
    properties: { asset: { type: 'string' } },
    required: ['asset']
  };

  async execute(input: { asset: string }): Promise<ToolResult> {
    return { status: 'success', data: { asset: input.asset, price: 0 } };
  }
}