import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { execGitCommand } from './util.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Input schema for git_commit
const GitCommitInputSchema = z.object({
  message: z.string().describe("Commit message following the rules: use present tense, start with capital letter, no prefixes, be descriptive but concise, and use dashes for bullet points"),
  repoPath: z.string().optional().default('.').describe("Path to the git repository")
});

// Commit changes
async function commitChanges(args: any) {
  const params = GitCommitInputSchema.parse(args);
  
  try {
    // Check if there are any changes to commit
    const { stdout: statusOutput } = await execGitCommand('git status --porcelain', params.repoPath);
    
    if (!statusOutput.trim()) {
      return {
        content: [{ type: "text", text: "No changes to commit." }]
      };
    }
    
    // Add all changes
    await execGitCommand('git add -A', params.repoPath);
    
    // For multiline commit messages, use a temporary file approach
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `git-commit-message-${Date.now()}.txt`);
    
    // Write the commit message to a temporary file
    fs.writeFileSync(tempFile, params.message, 'utf8');
    
    try {
      // Use the temporary file for the commit message
      const { stdout, stderr } = await execGitCommand(
        `git commit -F "${tempFile.replace(/\\/g, '/')}"`, 
        params.repoPath
      );
      
      if (stderr && !stderr.includes('create mode') && !stderr.includes('delete mode')) {
        return {
          content: [{ type: "text", text: `Warning: ${stderr}\n${stdout}` }]
        };
      }
      
      return {
        content: [{ type: "text", text: stdout }]
      };
    } finally {
      // Clean up the temporary file
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // Ignore errors when deleting the temp file
      }
    }
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
  description: "Commit all changes with a message following these rules:\n- Use present tense (\"Add feature\" not \"Added feature\")\n- Start with capital letter\n- No prefixes (like \"feat:\", \"fix:\", \"Initial commit:\")\n- Be descriptive but concise\n- Use dashes (-) for bullet points in multi-line messages\n\nIf you need to see the changes, use the \"git_diff\" tool first.",
  inputSchema: {
    type: "object",
    properties: {
      message: {
        type: "string",
        description: "Commit message following the rules: use present tense, start with capital letter, no prefixes, be descriptive but concise, and use dashes for bullet points"
      },
      repoPath: {
        type: "string",
        description: "Path to the git repository",
        default: "."
      }
    },
    required: ["message"]
  }
};

export { commitChanges };