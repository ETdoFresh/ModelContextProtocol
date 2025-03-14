import { z } from 'zod';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { validateRepoPath, execGitCommand } from './util.js';
import path from 'path';

// Input schema for git_diff
const GitDiffInputSchema = z.object({
  path: z.string().optional().describe("Optional path to get diff for specific files"),
  showall: z.boolean().optional().default(false).describe("Show both staged and unstaged changes"),
  repoPath: z.string().optional().default('.').describe("Path to the git repository")
});

// Filter out line ending warnings from git output
function filterGitWarnings(output: string): string {
  return output
    .split('\n')
    .filter(line => !line.includes('LF will be replaced by CRLF') && !line.startsWith('warning:'))
    .join('\n');
}

// Show the current git diff
async function getDiff(args: any) {
  const params = GitDiffInputSchema.parse(args);
  
  try {
    // Resolve and validate the repository path
    const resolvedRepoPath = path.resolve(params.repoPath);
    await validateRepoPath(resolvedRepoPath);
    
    // Check if there are any staged changes
    const { stdout: stagedCheck } = await execGitCommand('git diff --cached --quiet || echo "has_staged"', resolvedRepoPath);
    const hasStagedChanges = stagedCheck.includes('has_staged');
    
    let result = '';
    let stderr = '';
    
    if (params.showall) {
      // Show both staged and unstaged changes
      const stagedResult = await execGitCommand('git diff --cached', resolvedRepoPath);
      const unstagedResult = await execGitCommand('git diff', resolvedRepoPath);
      
      // Get untracked files
      const { stdout: untrackedOutput, stderr: untrackedStderr } = await execGitCommand('git ls-files --others --exclude-standard', resolvedRepoPath);
      
      // Filter out warnings
      const filteredStagedStderr = filterGitWarnings(stagedResult.stderr);
      const filteredUnstagedStderr = filterGitWarnings(unstagedResult.stderr);
      const filteredUntrackedStderr = filterGitWarnings(untrackedStderr);
      
      if (stagedResult.stdout.trim()) {
        result += "=== Staged Changes ===\n" + stagedResult.stdout + "\n";
      }
      
      if (unstagedResult.stdout.trim() || untrackedOutput.trim()) {
        result += "=== Unstaged Changes ===\n";
        if (unstagedResult.stdout.trim()) {
          result += unstagedResult.stdout;
        }
        
        // Add untracked files to unstaged section
        if (untrackedOutput.trim()) {
          const untrackedFiles = untrackedOutput.split('\n').filter(Boolean);
          if (untrackedFiles.length > 0) {
            result += (unstagedResult.stdout.trim() ? "\n\n" : "") + "Untracked files:\n" + 
                      untrackedFiles.map(file => `? ${file}`).join('\n');
          }
        }
      }
      
      stderr = filteredStagedStderr || filteredUnstagedStderr || filteredUntrackedStderr;
    } else {
      // Show only staged changes if they exist, otherwise show unstaged changes
      if (hasStagedChanges) {
        const { stdout, stderr: stderrOutput } = await execGitCommand('git diff --cached', resolvedRepoPath);
        result = stdout;
        stderr = filterGitWarnings(stderrOutput);
      } else {
        const { stdout, stderr: stderrOutput } = await execGitCommand('git diff', resolvedRepoPath);
        const { stdout: untrackedOutput, stderr: untrackedStderr } = await execGitCommand('git ls-files --others --exclude-standard', resolvedRepoPath);
        
        result = stdout;
        
        // Add untracked files to the output
        if (untrackedOutput.trim()) {
          const untrackedFiles = untrackedOutput.split('\n').filter(Boolean);
          if (untrackedFiles.length > 0) {
            result += (stdout.trim() ? "\n\n" : "") + "Untracked files:\n" + 
                      untrackedFiles.map(file => `? ${file}`).join('\n');
          }
        }
        
        stderr = filterGitWarnings(stderrOutput);
        if (untrackedStderr && untrackedStderr.trim()) {
          stderr = stderr ? stderr + "\n" + filterGitWarnings(untrackedStderr) : filterGitWarnings(untrackedStderr);
        }
      }
    }
    
    if (stderr && stderr.trim()) {
      return {
        content: [{ type: "text", text: `Error: ${stderr}` }],
        isError: true
      };
    }
    
    if (!result.trim()) {
      return {
        content: [{ type: "text", text: "No changes detected." }]
      };
    }
    
    return {
      content: [{ type: "text", text: result }]
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
      showall: {
        type: "boolean",
        description: "Show both staged and unstaged changes",
        default: false
      }
    },
    required: ["repoPath"]
  }
};

export { getDiff };