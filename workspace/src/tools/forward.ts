import { Tool } from '@modelcontextprotocol/sdk/types.js';
import WorkspaceState from '../state.js';
import { forwardToTerminal } from '../wrappers/terminal.js';
import { forwardToGit } from '../wrappers/git.js';

// Map of tool prefixes to their respective forwarding functions
const forwardingMap: Record<string, (name: string, args: any) => Promise<any>> = {
  'execute_': forwardToTerminal,
  'git_': forwardToGit,
  // Add more forwarding mappings as needed
};

/**
 * Forward a tool request to the appropriate MCP server
 * @param name The name of the tool being called
 * @param args The arguments for the tool
 * @returns The result from the forwarded tool call
 */
export async function forwardToolRequest(name: string, args: any) {
  // Find the appropriate forwarder based on the tool name prefix
  for (const [prefix, forwarder] of Object.entries(forwardingMap)) {
    if (name.startsWith(prefix)) {
      return await forwarder(name, args);
    }
  }
  
  throw new Error(`No forwarding handler found for tool: ${name}`);
}
