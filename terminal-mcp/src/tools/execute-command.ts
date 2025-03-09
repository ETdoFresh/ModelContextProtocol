import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { isPathAllowed, isCommandAllowed, escapeCommand } from '../utils/security.js';

const execAsync = promisify(exec);

// Input schema for execute_command
const ExecuteCommandInputSchema = z.object({
  command: z.string().describe("The command to execute at the current working directory"),
  timeout: z.number().min(1).max(60000).optional().default(10000).describe("Maximum execution time in milliseconds (1-60000)")
});

// Execute a command in the current working directory
async function executeCommandInCwd(command: string, timeout: number): Promise<string> {
  try {
    // Sanitize and validate the command
    const sanitizedCommand = escapeCommand(command);
    
    if (!isCommandAllowed(sanitizedCommand)) {
      return "Error: Command contains potentially dangerous operations and has been blocked for security reasons.";
    }
    
    // @ts-ignore (global is defined in index.ts)
    const cwd = global.cwd;
    
    // Ensure cwd is allowed
    if (!isPathAllowed(cwd)) {
      return `Error: Current working directory (${cwd}) is not in the allowed directories list.`;
    }
    
    // Execute the command with timeout
    const { stdout, stderr } = await execAsync(sanitizedCommand, {
      cwd,
      timeout,
      maxBuffer: 1024 * 1024, // 1MB buffer
    });
    
    // Return both stdout and stderr
    let result = '';
    if (stdout) result += `STDOUT:\n${stdout}\n`;
    if (stderr) result += `STDERR:\n${stderr}`;
    
    return result.trim() || "Command executed successfully with no output.";
  } catch (error: any) {
    // Handle different types of errors
    if (error.killed && error.signal === 'SIGTERM') {
      return `Error: Command execution timed out after ${timeout}ms.`;
    }
    
    return `Error: ${error.message}`;
  }
}

// Handler function for the execute_command tool
export async function executeCommand(args: any) {
  const params = ExecuteCommandInputSchema.parse(args);
  
  const result = await executeCommandInCwd(params.command, params.timeout);
  
  return {
    content: [{ type: "text", text: result }]
  };
}

// Tool definition export
export const executeCommandTool: Tool = {
  name: "execute_command",
  description: "Executes a command at the current working directory with security restrictions",
  parameters: zodToJsonSchema(ExecuteCommandInputSchema),
};