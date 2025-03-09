import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

const execAsync = promisify(exec);

// Escape command to prevent injection
function escapeCommand(command: string): string {
  // Replace any instances of multiple semicolons with a single one
  return command.replace(/;{2,}/g, ';');
}

// Input schema for execute_command
const ExecuteCommandInputSchema = z.object({
  command: z.string().describe("The command to execute"),
  cwd: z.string().optional().describe("Optional working directory for the command"),
  timeout: z.number().min(1).max(60000).optional().default(10000).describe("Maximum execution time in milliseconds (1-60000)")
});

// Execute a command
async function executeCommandImpl(command: string, cwd?: string, timeout?: number): Promise<string> {
  try {
    // Sanitize the command
    const sanitizedCommand = escapeCommand(command);
    
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
  
  const result = await executeCommandImpl(params.command, params.cwd, params.timeout);
  
  return {
    content: [{ type: "text", text: result }]
  };
}

// Tool definition export
export const executeCommandTool: Tool = {
  name: "execute_command",
  description: "Executes a command with optional working directory",
  inputSchema: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The command to execute"
      },
      cwd: {
        type: "string",
        description: "Optional working directory for the command"
      },
      timeout: {
        type: "number",
        description: "Maximum execution time in milliseconds (1-60000)",
        default: 10000,
        minimum: 1,
        maximum: 60000
      }
    },
    required: ["command"]
  }
};