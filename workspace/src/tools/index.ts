import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { cd, cdTool } from './cd.js';
import { pwd, pwdTool } from './pwd.js';
import { workspaceExecuteCommandTool, workspaceExecuteCommand } from './terminal-wrapper.js';

export const tools: Record<Tool['name'], { definition: Tool, function: Function }> = {
  [cdTool.name]: { definition: cdTool, function: cd },
  [pwdTool.name]: { definition: pwdTool, function: pwd },
  [workspaceExecuteCommandTool.name]: { definition: workspaceExecuteCommandTool, function: workspaceExecuteCommand }
};