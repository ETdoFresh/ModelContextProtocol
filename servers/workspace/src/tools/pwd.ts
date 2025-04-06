import { Tool } from '@modelcontextprotocol/sdk/types.js';
import WorkspaceState from '../state.js';

// Handler function for the pwd tool
export async function pwd() {
  const state = WorkspaceState.getInstance();
  const currentDir = state.getCwd();
  
  return {
    content: [{ type: "text", text: currentDir }]
  };
}

// Tool definition export
export const pwdTool: Tool = {
  name: "pwd",
  description: "Print the current working directory",
  inputSchema: {
    type: "object",
    properties: {},
    required: []
  }
};
