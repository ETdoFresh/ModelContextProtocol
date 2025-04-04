#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListToolsResultSchema,
  CallToolResultSchema
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

// Redirect console.log to stderr to avoid interfering with JSON-RPC communication
const doNothing = (message: string, ...args: any[]) => { }
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
console.log = (...args) => doNothing('[info] ', ...args);
console.error = (...args) => originalConsoleError('[error] ', ...args);

// Define the Tool interface
interface Tool {
  name: string;
  description: string;
  inputSchema: any;
}

// Define our custom tools
const customTools: Tool[] = [
  {
    name: "mcp0_hello_world",
    description: "This is a simple Hello World tool that returns a greeting message",
    inputSchema: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description: "Name to greet (optional)"
        }
      },
      required: []
    }
  }
];

// Custom tool handlers
const customToolHandlers: Record<string, (args: any) => Promise<any>> = {
  mcp0_hello_world: async (args: any) => {
    const name = args.name || "World";
    return {
      content: [{ type: "text", text: `Hello, ${name}!` }]
    };
  }
};

// Function to start the repomix MCP server as a child process
async function startRepomixMcpProcess() {
  console.log('Starting repomix MCP server as a child process...');
  
  // Use the full path to npx to avoid path issues
  const npxPath = 'C:\\Program Files\\nodejs\\npx.cmd';
  const command = `& "${npxPath}" repomix --mcp`;
  
  // Start the repomix MCP server as a child process using PowerShell
  const repomixProcess = spawn('powershell.exe', ['-Command', command], {
    stdio: 'pipe',
    cwd: resolve(process.cwd()) // Ensure we're using an absolute path
  });
  
  // Handle process exit
  repomixProcess.on('exit', (code: number | null) => {
    console.log(`Repomix MCP server exited with code ${code}`);
    process.exit(code || 1);
  });
  
  // Handle errors
  repomixProcess.on('error', (err: Error) => {
    console.error('Failed to start repomix MCP server:', err);
    process.exit(1);
  });
  
  // Log stdout and stderr
  repomixProcess.stdout!.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (output) {
      console.log(`Repomix MCP stdout: ${output}`);
    }
  });
  
  repomixProcess.stderr!.on('data', (data: Buffer) => {
    const output = data.toString().trim();
    if (output) {
      console.error(`Repomix MCP stderr: ${output}`);
    }
  });
  
  return repomixProcess;
}

// Create the repomix client
const repomixClient = new Client({
  name: "repomix-clipboard",
  version: "0.1.0",
});

// Connect the repomix client to the repomix MCP server
async function connectRepomixClient() {
  try {
    const transport = new StdioClientTransport({
      spawn: startRepomixMcpProcess,
    });
    await repomixClient.connect(transport);
  } catch (error) {
    console.error('Error connecting to repomix MCP server:', error);
    process.exit(1);
  }
}

// Function to get the list of tools from the repomix MCP server
async function getRepomixTools(): Promise<Tool[]> {
  try {
    // Execute a special command to list the tools
    // This is a workaround since we can't directly access the JSON-RPC API
    const result = await listTools();
    
    // Parse the result to get the tools
    let tools: Tool[] = [];
    
    if (Array.isArray(result)) {
      tools = result.map((tool: any) => ({
        ...tool,
        inputSchema: tool.inputSchema || { type: "object", properties: {}, required: [] }
      }));
    } else if (result.tools && Array.isArray(result.tools)) {
      tools = result.tools.map((tool: any) => ({
        ...tool,
        inputSchema: tool.inputSchema || { type: "object", properties: {}, required: [] }
      }));
    } else if (typeof result === 'string') {
      // Try to extract tool information from the string output
      const toolMatches = result.match(/Tool: ([\w_]+) - (.+?)(?=\nTool:|$)/gs);
      if (toolMatches) {
        tools = toolMatches.map(match => {
          const [_, name, description] = match.match(/Tool: ([\w_]+) - (.+)/) || [];
          return { 
            name, 
            description,
            inputSchema: { type: "object", properties: {}, required: [] }
          };
        }).filter(t => t.name);
      }
    }
    
    console.log('Discovered repomix tools:', tools.map(tool => tool.name).join(', '));
    
    return [...tools];
  } catch (error) {
    console.error('Error getting repomix tools:', error);
    return [];
  }
}

// Function to execute a command on the repomix MCP server
async function executeRepomixCommand(toolName: string, args: any) {
  try {
    // Send the JSON-RPC request over the existing connection.
    const response = await repomixClient.request(
      { method: "tools/call", params: { name: toolName, arguments: args } },
      CallToolRequestSchema,
      CallToolResultSchema
    );
    return response;
  } catch (error) {
    console.error("Error executing repomix command:", error);
    throw error;
  }
}

// Function to list tools on the repomix MCP server
async function listTools() {
  try {
    // Send the JSON-RPC request over the existing connection.
    const response = await repomixClient.request(
      { method: "tools/list", params: {} },
      ListToolsRequestSchema,
      ListToolsResultSchema
    );
    return response;
  } catch (error) {
    console.error("Error listing tools:", error);
    throw error;
  }
}

// Create and start the MCP server
async function main() {
  try {
    // Connect the repomix client to the repomix MCP server
    await connectRepomixClient();
    
    // Get the list of tools from the repomix MCP server
    const tools: Tool[] = [];
    tools.push(...(await getRepomixTools()));
    tools.push(...customTools);
    
    console.log('Discovered repomix tools:', tools.map(tool => tool.name).join(', '));
    
    // Create the server
    const server = new Server(
      {
        name: "repomix-clipboard",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );
    
    // Set up the ListTools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools,
      };
    });
    
    // Set up the CallTool handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;
        
        // Check if it's one of our custom tools
        if (customToolHandlers[name]) {
          return await customToolHandlers[name](args);
        }
        
        // Otherwise, it should be a repomix tool
        if (!tools.some(tool => tool.name === name)) {
          throw new Error(`Unknown tool: ${name}`);
        }
        
        // Execute the tool command on the repomix MCP server
        const result = await executeRepomixCommand(name, args);
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: "text", text: `Error: ${errorMessage}` }],
          isError: true,
        };
      }
    });
    
    // Start the server
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    // Don't log to stdout after server is connected
    // This would interfere with JSON-RPC communication
    process.stdout.write('Repomix Clipboard MCP Server running on stdio');
  } catch (error) {
    console.error('Error starting MCP server:', error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});