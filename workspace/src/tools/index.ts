import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { cd, cdTool } from './cd.js';
import { pwd, pwdTool } from './pwd.js';
import { forwardToolRequest } from './forward.js';

// Export all available tools
export const allTools: Tool[] = [
  cdTool,
  pwdTool,
  // Tools from other MCP servers will be discovered and forwarded
];

// Type for the tool handler names
export type HandlerName = 'cd' | 'pwd';

// Map tool names to their handler functions
export const handlers: Record<HandlerName, (args: any) => Promise<any>> = {
  'cd': cd,
  'pwd': pwd,
};

// Generic handler for forwarded tools
export async function handleToolRequest(name: string, args: any) {
  // Check if we have a direct handler
  if (name in handlers) {
    return await (handlers as any)[name](args);
  }
  
  // Otherwise, forward the request
  return await forwardToolRequest(name, args);
}
