import { executeCommand, executeCommandTool } from './execute-command.js';
import { 
  listAllowedDirectories, listAllowedDirectoriesTool,
  addAllowedDirectory, addAllowedDirectoryTool,
  removeAllowedDirectory, removeAllowedDirectoryTool 
} from './allowed-directories.js';
import {
  getCwd, getCwdTool,
  changeCwd, changeCwdTool
} from './cwd-operations.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

// Export all available tools
export const allTools: Tool[] = [
  executeCommandTool,
  listAllowedDirectoriesTool,
  addAllowedDirectoryTool,
  removeAllowedDirectoryTool,
  getCwdTool,
  changeCwdTool
];

// Type for the tool handler names
export type HandlerName = 
  'execute_command' | 
  'list_allowed_directories' | 
  'add_allowed_directory' | 
  'remove_allowed_directory' |
  'get_cwd' |
  'change_cwd';

// Map tool names to their handler functions
export const handlers: Record<HandlerName, (args: any) => Promise<any>> = {
  'execute_command': executeCommand,
  'list_allowed_directories': listAllowedDirectories,
  'add_allowed_directory': addAllowedDirectory,
  'remove_allowed_directory': removeAllowedDirectory,
  'get_cwd': getCwd,
  'change_cwd': changeCwd
};