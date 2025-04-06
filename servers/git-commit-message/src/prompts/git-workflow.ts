import { Prompt } from '@modelcontextprotocol/sdk/types.js';
import { getDiff } from '../tools/git-diff.js';
import { commitChanges } from '../tools/git-commit.js';
import { pushChanges } from '../tools/git-push.js';
import { execGitCommand } from '../tools/util.js';
import path from 'path';

// Function to check if output only contains warnings or is empty
function hasOnlyWarningsOrEmpty(text: string): boolean {
  if (!text || !text.trim()) return true;
  
  return text.split('\n').every(line => 
    line.trim() === '' || 
    line.startsWith('warning:') || 
    line.startsWith('Error: warning:')
  );
}

// Git workflow prompt handler
async function handleGitWorkflow(args?: Record<string, any>) {
  const repoPath = args?.repoPath || '.';
  
  try {
    // Get the full diff directly using the updated getDiff function
    const resolvedRepoPath = path.resolve(repoPath);
    
    // Use the updated getDiff function
    const diffResult = await getDiff({ repoPath: resolvedRepoPath });
    
    // Get the diff output
    const diffOutput = diffResult.content[0].text;
    
    // Check if there are any actual changes (not just warnings)
    if (diffOutput === 'No changes detected.' || hasOnlyWarningsOrEmpty(diffOutput)) {
      return {
        description: 'Git Workflow',
        messages: [
          {
            role: 'assistant',
            content: {
              type: 'text',
              text: 'No changes detected in the repository. Nothing to commit or push.'
            }
          }
        ]
      };
    }
    
    // Return a conversation that guides through the git workflow
    return {
      description: 'Git Workflow: View changes, commit, and push',
      messages: [
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `# Git Changes Detected\n\nHere are the current changes in your repository:\n\n\`\`\`diff\n${diffOutput}\n\`\`\`\n\nYou can now:\n1. Commit these changes with a descriptive message\n2. Push the changes to your remote repository\n\nTo commit, use the \`git_commit\` tool with a message that follows these guidelines:\n- Use present tense ("Add feature" not "Added feature")\n- Start with capital letter\n- No prefixes (like "feat:", "fix:")\n- Be descriptive but concise\n\nAfter committing, you can push using the \`git_push\` tool.`
          }
        }
      ]
    };
  } catch (error: any) {
    return {
      description: 'Git Workflow Error',
      messages: [
        {
          role: 'assistant',
          content: {
            type: 'text',
            text: `Error getting git diff: ${error.message}`
          }
        }
      ]
    };
  }
}

// Git workflow prompt definition
export const gitWorkflowPrompt: Prompt & { handler: typeof handleGitWorkflow } = {
  name: 'git-workflow',
  description: 'View git changes, commit, and push in a guided workflow',
  arguments: [
    {
      name: 'repoPath',
      description: 'Path to the git repository',
      required: false
    }
  ],
  handler: handleGitWorkflow
};
