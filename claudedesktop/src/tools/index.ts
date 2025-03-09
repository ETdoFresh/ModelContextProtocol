import { killClaude, killClaudeTool } from './kill-claude.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Export all available tools
export const allTools: Tool[] = [
  killClaudeTool,
];

// Type for the tool handler names
export type HandlerName = 'kill_claude';

// Map tool names to their handler functions
export const handlers: Record<HandlerName, (args: any) => Promise<any>> = {
  'kill_claude': killClaude,
};