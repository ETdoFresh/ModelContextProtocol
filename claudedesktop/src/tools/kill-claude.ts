import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

const execAsync = promisify(exec);

// Input schema with optional force flag
const KillClaudeInputSchema = z.object({
  force: z.boolean().optional().default(false).describe("Force kill the process if true"),
});

// Detect OS and use appropriate command to find and kill Claude processes
async function killClaudeProcesses(force: boolean): Promise<string> {
  const isWin = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';
  
  let findCmd: string;
  let killCmd: string;
  
  try {
    // Find Claude processes based on OS
    if (isWin) {
      findCmd = 'tasklist /FI "IMAGENAME eq Claude*" /FO CSV';
      const { stdout: findOutput } = await execAsync(findCmd);
      
      // Parse process IDs from tasklist output
      const lines = findOutput.split('\n').filter(line => line.includes('Claude'));
      if (lines.length === 0) {
        return "No Claude processes found.";
      }
      
      // Extract PIDs from CSV format
      const pids: string[] = [];
      lines.forEach(line => {
        const match = /"Claude[^"]*","?(\d+)"?/.exec(line);
        if (match && match[1]) {
          pids.push(match[1]);
        }
      });
      
      if (pids.length === 0) {
        return "No Claude process IDs could be extracted.";
      }
      
      // Kill each process
      const results: string[] = [];
      for (const pid of pids) {
        killCmd = force ? `taskkill /F /PID ${pid}` : `taskkill /PID ${pid}`;
        try {
          const { stdout: killOutput } = await execAsync(killCmd);
          results.push(`Process ${pid}: ${killOutput.trim()}`);
        } catch (err: any) {
          results.push(`Error killing process ${pid}: ${err.message}`);
        }
      }
      
      return `Attempted to kill ${pids.length} Claude processes:\n${results.join('\n')}`;
    } 
    else if (isMac) {
      findCmd = 'pgrep -i "Claude"';
      let pids: string[] = [];
      
      try {
        const { stdout: findOutput } = await execAsync(findCmd);
        pids = findOutput.trim().split('\n').filter(pid => pid);
      } catch (err) {
        // pgrep returns non-zero if no processes found
        return "No Claude processes found.";
      }
      
      if (pids.length === 0) {
        return "No Claude processes found.";
      }
      
      // Kill each process
      const results: string[] = [];
      for (const pid of pids) {
        killCmd = force ? `kill -9 ${pid}` : `kill ${pid}`;
        try {
          await execAsync(killCmd);
          results.push(`Process ${pid}: Terminated${force ? ' (forced)' : ''}`);
        } catch (err: any) {
          results.push(`Error killing process ${pid}: ${err.message}`);
        }
      }
      
      return `Attempted to kill ${pids.length} Claude processes:\n${results.join('\n')}`;
    }
    else if (isLinux) {
      findCmd = 'pgrep -i "Claude"';
      let pids: string[] = [];
      
      try {
        const { stdout: findOutput } = await execAsync(findCmd);
        pids = findOutput.trim().split('\n').filter(pid => pid);
      } catch (err) {
        // pgrep returns non-zero if no processes found
        return "No Claude processes found.";
      }
      
      if (pids.length === 0) {
        return "No Claude processes found.";
      }
      
      // Kill each process
      const results: string[] = [];
      for (const pid of pids) {
        killCmd = force ? `kill -9 ${pid}` : `kill ${pid}`;
        try {
          await execAsync(killCmd);
          results.push(`Process ${pid}: Terminated${force ? ' (forced)' : ''}`);
        } catch (err: any) {
          results.push(`Error killing process ${pid}: ${err.message}`);
        }
      }
      
      return `Attempted to kill ${pids.length} Claude processes:\n${results.join('\n')}`;
    }
    else {
      return `Unsupported operating system: ${process.platform}`;
    }
  } catch (error: any) {
    return `Error: ${error.message}`;
  }
}

// Handler function for the kill-claude tool
export async function killClaude(args: any) {
  const params = KillClaudeInputSchema.parse(args);
  const result = await killClaudeProcesses(params.force);
  
  return {
    content: [{ type: "text", text: result }]
  };
}

// Tool definition export
export const killClaudeTool: Tool = {
  name: "kill_claude",
  description: "Terminates any running Claude desktop application processes",
  parameters: zodToJsonSchema(KillClaudeInputSchema),
};