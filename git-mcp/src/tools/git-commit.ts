import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

const execAsync = promisify(exec);

// Input schema for git_commit
const GitCommitInputSchema = z.object({
  message: z.string().describe("Commit message following the rules: use present tense, start with capital letter, no prefixes, be descriptive but concise, and use dashes for bullet points")
});

// Commit changes
async function commitChanges(args: any) {
  const params = GitCommitInputSchema.parse(args);
  
  try {
    // Check if there are any changes to commit
    const { stdout: statusOutput } = await execAsync('git status --porcelain', {
      // @ts-ignore (global is defined in index.ts)
      cwd: global.repoPath,
    });
    
    if (!statusOutput.trim()) {
      return {
        content: [{ type: "text", text: "No changes to commit." }]
      };
    }
    
    // Add all changes
    await execAsync('git add -A', {
      // @ts-ignore (global is defined in index.ts)
      cwd: global.repoPath,
    });
    
    // Commit with the provided message
    const { stdout, stderr } = await execAsync(`git commit -m "${params.message.replace(/"/g, '\\"')}"`, {
      // @ts-ignore (global is defined in index.ts)
      cwd: global.repoPath,
    });
    
    if (stderr && !stderr.includes('create mode') && !stderr.includes('delete mode')) {
      return {
        content: [{ type: "text", text: `Warning: ${stderr}\n${stdout}` }]
      };
    }
    
    return {
      content: [{ type: "text", text: stdout }]
    };
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error executing git commit: ${error.message}` }],
      isError: true
    };
  }
}

// Tool definition export
export const gitCommitTool: Tool = {
  name: "git_commit",
  description: "Commit all changes with a message following these rules:\n- Use present tense (\"Add feature\" not \"Added feature\")\n- Start with capital letter\n- No prefixes (like \"feat:\", \"fix:\", \"Initial commit:\")\n- Be descriptive but concise\n- Use dashes (-) for bullet points in multi-line messages",
  parameters: zodToJsonSchema(GitCommitInputSchema),
};

export { commitChanges };