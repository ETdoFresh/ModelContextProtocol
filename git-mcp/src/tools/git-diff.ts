import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

const execAsync = promisify(exec);

// Input schema for git_diff
const GitDiffInputSchema = z.object({
  path: z.string().optional().describe("Optional path to get diff for specific files"),
  cached: z.boolean().optional().default(false).describe("Show staged changes")
});

// Show the current git diff
async function getDiff(args: any) {
  const params = GitDiffInputSchema.parse(args);
  
  try {
    // Build the git diff command
    let command = 'git diff';
    if (params.cached) {
      command += ' --cached';
    }
    if (params.path) {
      command += ` -- "${params.path}"`;
    }
    
    // Execute the git diff command
    const { stdout, stderr } = await execAsync(command, {
      // @ts-ignore (global is defined in index.ts)
      cwd: global.repoPath,
    });
    
    if (stderr) {
      return {
        content: [{ type: "text", text: `Error: ${stderr}` }],
        isError: true
      };
    }
    
    if (!stdout.trim()) {
      return {
        content: [{ type: "text", text: "No changes detected." }]
      };
    }
    
    return {
      content: [{ type: "text", text: stdout }]
    };
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error executing git diff: ${error.message}` }],
      isError: true
    };
  }
}

// Tool definition export
export const gitDiffTool: Tool = {
  name: "git_diff",
  description: "Show changes between commits, commit and working tree, etc",
  parameters: zodToJsonSchema(GitDiffInputSchema),
};

export { getDiff };