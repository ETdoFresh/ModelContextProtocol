import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { cd, cdTool } from './cd.js';
import { pwd, pwdTool } from './pwd.js';
import { workspaceExecuteCommandTool, workspaceExecuteCommand } from './terminal-wrapper.js';
import { workspaceGitDiffTool, workspaceGitDiff } from './git-wrapper.js';
import { workspaceGitCommitTool, workspaceGitCommit } from './git-wrapper.js';
import { workspaceGitPushTool, workspaceGitPush } from './git-wrapper.js';

export const tools: Record<Tool['name'], { definition: Tool, function: Function }> = {
  [cdTool.name]: { definition: cdTool, function: cd },
  [pwdTool.name]: { definition: pwdTool, function: pwd },
  [workspaceExecuteCommandTool.name]: { definition: workspaceExecuteCommandTool, function: workspaceExecuteCommand },
  [workspaceGitDiffTool.name]: { definition: workspaceGitDiffTool, function: workspaceGitDiff },
  [workspaceGitCommitTool.name]: { definition: workspaceGitCommitTool, function: workspaceGitCommit },
  [workspaceGitPushTool.name]: { definition: workspaceGitPushTool, function: workspaceGitPush }
};