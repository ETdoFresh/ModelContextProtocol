#!/usr/bin/env node

// Import McpServer and transport like repopack
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// Import the handler function and the Zod schema (not the Tool object)
import { openrouterCompletion, OpenRouterCompletionInputSchema } from './openrouter-tool.js';
import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Create the McpServer instance
const server = new McpServer(
  {
    name: "openrouter-completion-server",
    version: "1.0.0",
  }
  // No capabilities needed here
);

// Register the tool using server.tool() and the Zod schema's .shape
server.tool(
  "call_openrouter", // Tool name
  "Makes a chat completion request to the OpenRouter API using the specified model, prompt, and temperature.", // Tool description
  OpenRouterCompletionInputSchema.shape, // Pass the Zod schema's shape
  openrouterCompletion // Pass the handler function
);

// Run the server using StdioTransport like repopack
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("OpenRouter MCP Server running on stdio (using McpServer)");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});

// Note: McpServer might have different shutdown handling, TBD if needed. 