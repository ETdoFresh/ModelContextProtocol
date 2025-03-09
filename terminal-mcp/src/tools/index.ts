import { executeCommand, executeCommandTool } from './execute-command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Export all available tools
export const allTools: Tool[] = [
  executeCommandTool
];

// Type for the tool handler names
export type HandlerName = 'execute_command';

// Map tool names to their handler functions
export const handlers: Record<HandlerName, (args: any) => Promise<any>> = {
  'execute_command': executeCommand
};