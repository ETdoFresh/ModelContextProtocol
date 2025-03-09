import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { validateRepoPath, execGitCommand } from './util.js';
import path from 'path';

// Input schema for git_diff
const GitDiffInputSchema = z.object({
  path: z.string().optional().describe("Optional path to get diff for specific files"),
  cached: z.boolean().optional().default(false).describe("Show staged changes"),
  repoPath: z.string().optional().default('.').describe("Path to the git repository")
});

// Show the current git diff
async function getDiff(args: any) {
  const params = GitDiffInputSchema.parse(args);
  
  try {
    // Resolve and validate the repository path
    const resolvedRepoPath = path.resolve(params.repoPath);
    await validateRepoPath(resolvedRepoPath);
    
    // Build the git diff command
    let command = 'git diff';
    if (params.cached) {
      command += ' --cached';
    }
    if (params.path) {
      command += ` -- "${params.path}"`;
    }
    
    // Execute the git diff command using the utility function
    const { stdout, stderr } = await execGitCommand(command, resolvedRepoPath);
    
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
  inputSchema: {
    type: "object",
    properties: {
      repoPath: {
        type: "string",
        description: "Absolute Path to the git repository"
      },
      path: {
        type: "string",
        description: "Optional path to get diff for specific files"
      },
      cached: {
        type: "boolean",
        description: "Show staged changes",
        default: false
      }
    },
    required: ["repoPath"]
  }
};

export { getDiff };