import { executeCommand, executeCommandTool } from '@local/terminal/tools/execute-command.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import WorkspaceState from '../state.js';

// Create a modified version of the execute_command tool without the cwd parameter
export const workspaceExecuteCommandTool: Tool = {
  ...executeCommandTool,
  inputSchema: {
    ...executeCommandTool.inputSchema,
    properties: {
      ...executeCommandTool.inputSchema.properties,
      cwd: undefined
    }
  }
};

/**
 * Forward a request to the terminal MCP server
 * @param args The arguments for the tool
 * @returns The result from the terminal MCP server
 */
export async function workspaceExecuteCommand(args: any) {
  return await executeCommand({
    ...args,
    cwd: WorkspaceState.getInstance().getCwd()
  });
}
