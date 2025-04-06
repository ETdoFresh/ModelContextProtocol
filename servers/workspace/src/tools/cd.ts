import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import WorkspaceState from '../state.js';

// Input schema for cd command
const CdInputSchema = z.object({
  path: z.string().describe("Directory path to change to")
});

// Handler function for the cd tool
export async function cd(args: any) {
  const params = CdInputSchema.parse(args);
  const state = WorkspaceState.getInstance();
  
  const result = state.setCwd(params.path);
  
  return {
    content: [{ type: "text", text: result.message }],
    isError: !result.success
  };
}

// Tool definition export
export const cdTool: Tool = {
  name: "cd",
  description: "Change the current working directory",
  inputSchema: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Directory path to change to"
      }
    },
    required: ["path"]
  }
};
