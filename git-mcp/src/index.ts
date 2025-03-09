#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import { exec } from 'child_process';
import { promisify } from 'util';
import { allTools, handlers, HandlerName } from "./tools/index.js";

const execAsync = promisify(exec);

// Declare globals
declare global {
  var repoPath: string;
}

// Command line argument parsing
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: mcp-server-git <repository-path>");
  process.exit(1);
}

// Store repository path
global.repoPath = path.resolve(args[0]);

// Validate that the path exists and is a git repository
(async () => {
  try {
    const stats = await fs.stat(global.repoPath);
    if (!stats.isDirectory()) {
      console.error(`Error: ${global.repoPath} is not a directory`);
      process.exit(1);
    }
    
    // Check if it's a git repository
    try {
      await execAsync('git rev-parse --is-inside-work-tree', {
        cwd: global.repoPath,
      });
    } catch (error) {
      console.error(`Error: ${global.repoPath} is not a git repository`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`Error accessing directory ${global.repoPath}:`, error);
    process.exit(1);
  }
})();

// Server setup
const server = new Server(
  {
    name: "git-mcp-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: args } = request.params;
    const handler = handlers[name as HandlerName];
    
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    return await handler(args);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start server
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Git MCP Server running on stdio");
  console.error("Repository path:", global.repoPath);
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});