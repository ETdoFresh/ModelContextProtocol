import { Tool } from '@modelcontextprotocol/sdk/types.js';
import WorkspaceState from '../state.js';
import { gitDiffTool, getDiff } from '@local/git-commit-message/tools/git-diff.js';
import { gitCommitTool, commitChanges } from '@local/git-commit-message/tools/git-commit.js';
import { gitPushTool, pushChanges } from '@local/git-commit-message/tools/git-push.js';

// Create modified versions of the git tools without the repoPath parameter
export const workspaceGitDiffTool: Tool = {
  ...gitDiffTool,
  inputSchema: {
    ...gitDiffTool.inputSchema,
    properties: {
      ...gitDiffTool.inputSchema.properties,
      repoPath: undefined
    }
  }
};

export const workspaceGitCommitTool: Tool = {
  ...gitCommitTool,
  inputSchema: {
    ...gitCommitTool.inputSchema,
    properties: {
      ...gitCommitTool.inputSchema.properties,
      repoPath: undefined
    }
  }
};

export const workspaceGitPushTool: Tool = {
  ...gitPushTool,
  inputSchema: {
    ...gitPushTool.inputSchema,
    properties: {
      ...gitPushTool.inputSchema.properties,
      repoPath: undefined
    }
  }
};

/**
 * Forward a git diff request to the Git MCP server
 * @param args The arguments for the tool
 * @returns The result from the Git MCP server
 */
export async function workspaceGitDiff(args: any) {
  return await getDiff({
    ...args,
    repoPath: WorkspaceState.getInstance().getCwd()
  });
}

/**
 * Forward a git commit request to the Git MCP server
 * @param args The arguments for the tool
 * @returns The result from the Git MCP server
 */
export async function workspaceGitCommit(args: any) {
  return await commitChanges({
    ...args,
    repoPath: WorkspaceState.getInstance().getCwd()
  });
}

/**
 * Forward a git push request to the Git MCP server
 * @param args The arguments for the tool
 * @returns The result from the Git MCP server
 */
export async function workspaceGitPush(args: any) {
  return await pushChanges({
    ...args,
    repoPath: WorkspaceState.getInstance().getCwd()
  });
}
