import { ToolResult } from '../types';

export abstract class BaseTool {
  abstract name: string;
  abstract description: string;
  abstract input_schema: Record<string, any>;
  abstract execute(input: any): Promise<ToolResult>;

  protected validateInput(input: Record<string, any>): void {
    const required = this.input_schema.required || [];
    for (const field of required) {
      if (!(field in input)) throw new Error(`Missing: ${field}`);
    }
  }
}