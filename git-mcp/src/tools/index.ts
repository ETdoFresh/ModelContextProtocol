import { getDiff, gitDiffTool } from './git-diff.js';
import { commitChanges, gitCommitTool } from './git-commit.js';
import { pushChanges, gitPushTool } from './git-push.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Export all available tools
export const allTools: Tool[] = [
  gitDiffTool,
  gitCommitTool,
  gitPushTool
];

// Type for the tool handler names
export type HandlerName = 'git_diff' | 'git_commit' | 'git_push';

// Map tool names to their handler functions
export const handlers: Record<HandlerName, (args: any) => Promise<any>> = {
  'git_diff': getDiff,
  'git_commit': commitChanges,
  'git_push': pushChanges
};