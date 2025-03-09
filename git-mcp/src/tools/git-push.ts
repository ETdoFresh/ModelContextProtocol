import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

const execAsync = promisify(exec);

// Input schema for git_push
const GitPushInputSchema = z.object({
  remote: z.string().optional().default("origin").describe("Remote repository name"),
  branch: z.string().optional().describe("Branch name (defaults to current branch)"),
  force: z.boolean().optional().default(false).describe("Force push (use with caution)")
});

// Push changes to remote repository
async function pushChanges(args: any) {
  const params = GitPushInputSchema.parse(args);
  
  try {
    // If branch is not specified, get the current branch
    let branch = params.branch;
    if (!branch) {
      const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', {
        // @ts-ignore (global is defined in index.ts)
        cwd: global.repoPath,
      });
      branch = stdout.trim();
    }
    
    // Build the git push command
    let command = `git push ${params.remote} ${branch}`;
    if (params.force) {
      command += ' --force';
    }
    
    // Execute the git push command
    const { stdout, stderr } = await execAsync(command, {
      // @ts-ignore (global is defined in index.ts)
      cwd: global.repoPath,
    });
    
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
  parameters: zodToJsonSchema(GitPushInputSchema),
};

export { pushChanges };