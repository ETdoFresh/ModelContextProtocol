import path from 'path';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { normalizePath, expandHome, isPathAllowed } from '../utils/security.js';

// Get current working directory
export async function getCwd() {
  return {
    // @ts-ignore (global is defined in index.ts)
    content: [{ type: "text", text: global.cwd }]
  };
}

// Input schema for change_cwd
const ChangeCwdInputSchema = z.object({
  path: z.string().describe("The directory path to set as current working directory")
});

// Change current working directory
export async function changeCwd(args: any) {
  const params = ChangeCwdInputSchema.parse(args);
  // @ts-ignore (global is defined in index.ts)
  const newCwd = normalizePath(path.resolve(global.cwd, expandHome(params.path)));
  
  if (!isPathAllowed(newCwd)) {
    return {
      content: [{ 
        type: "text", 
        text: `Error: Path "${newCwd}" is not within the allowed directories. Use add_allowed_directory first.` 
      }],
      isError: true
    };
  }
  
  // @ts-ignore (global is defined in index.ts)
  global.cwd = newCwd;
  
  return {
    content: [{ type: "text", text: `Current working directory changed to "${newCwd}".` }]
  };
}

// Tool definitions
export const getCwdTool: Tool = {
  name: "get_cwd",
  description: "Get the current working directory",
  parameters: {},
};

export const changeCwdTool: Tool = {
  name: "change_cwd",
  description: "Change the current working directory",
  parameters: zodToJsonSchema(ChangeCwdInputSchema),
};