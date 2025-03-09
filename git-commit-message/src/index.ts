#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { allTools, handlers, HandlerName } from "./tools/index.js";

// Create the MCP server
const server = new Server(
  {
    name: "git-commit-message",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler to list all available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: allTools };
});

// Handler to call a tool based on its name
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const { name, arguments: toolArgs } = request.params;
    const handler = handlers[name as HandlerName];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }
    return await handler(toolArgs);
  } catch (error: any) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

// Run the server on stdio
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Git Commit Message MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});