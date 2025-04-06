import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { execGitCommand } from './util.js';

// Input schema for git_push
const GitPushInputSchema = z.object({
  remote: z.string().optional().default("origin").describe("Remote repository name"),
  branch: z.string().optional().describe("Branch name (defaults to current branch)"),
  force: z.boolean().optional().default(false).describe("Force push (use with caution)"),
  repoPath: z.string().optional().default('.').describe("Path to the git repository")
});

// Push changes to remote repository
async function pushChanges(args: any) {
  const params = GitPushInputSchema.parse(args);
  
  try {
    // If branch is not specified, get the current branch
    let branch = params.branch;
    if (!branch) {
      const { stdout } = await execGitCommand('git rev-parse --abbrev-ref HEAD', params.repoPath);
      branch = stdout.trim();
    }
    
    // Build the git push command
    let command = `git push ${params.remote} ${branch}`;
    if (params.force) {
      command += ' --force';
    }
    
    // Execute the git push command
    const { stdout, stderr } = await execGitCommand(command, params.repoPath);
    
    // Git often outputs to stderr even for successful operations
    const output = stdout + (stderr ? `\n${stderr}` : '');
    
    // Check for common error patterns
    if (
      stderr && (
        stderr.includes('error:') || 
        stderr.includes('fatal:') ||
        stderr.includes('rejected')
      )
    ) {
      return {
        content: [{ type: "text", text: output }],
        isError: true
      };
    }
    
    return {
      content: [{ type: "text", text: output || "Push successful." }]
    };
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error executing git push: ${error.message}` }],
      isError: true
    };
  }
}

// Tool definition export
export const gitPushTool: Tool = {
  name: "git_push",
  description: "Push local commits to a remote repository",
  inputSchema: {
    type: "object",
    properties: {
      remote: {
        type: "string",
        description: "Remote repository name",
        default: "origin"
      },
      branch: {
        type: "string",
        description: "Branch name (defaults to current branch)"
      },
      force: {
        type: "boolean",
        description: "Force push (use with caution)",
        default: false
      },
      repoPath: {
        type: "string",
        description: "Path to the git repository",
        default: "."
      }
    }
  }
};

export { pushChanges };