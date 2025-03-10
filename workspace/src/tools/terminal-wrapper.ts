import { executeCommand, executeCommandTool } from '../../../terminal/src/tools/execute-command.js';
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
 * @param name The name of the tool being called
 * @param args The arguments for the tool
 * @returns The result from the terminal MCP server
 */
export async function workspaceExecuteCommand(name: string, args: any) {
  // Call the appropriate tool based on the name
  if (name === 'execute_command') {
    const state = WorkspaceState.getInstance();
    args = {
      ...args,
      cwd: state.getCwd()
    };
    return await executeCommand(args);
  }
  
  // If the tool is not implemented, return an error
  return {
    content: [{ 
      type: "text", 
      text: `[TERMINAL FORWARDING] Tool '${name}' is not implemented` 
    }],
    isError: true
  };
}
