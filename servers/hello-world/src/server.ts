#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Define the helloWorld tool
const helloWorldTool = {
  name: "helloWorld",
  description: "Says hello world.",
  inputSchema: { type: "object", properties: {}, required: [] }, // No input needed
  outputSchema: { type: "object", properties: { response: { type: "string" } }, required: ["response"] },
};

// Create the MCP server
const server = new Server(
  {
    name: "hello-world-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler to list the helloWorld tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: [helloWorldTool] };
});

// Handler to call the helloWorld tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "helloWorld") {
    return {
      content: [
        {
          type: "text",
          text: "Hello World!",
        },
      ],
    };
  } else {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

// Run the server on stdio
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Hello World MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
}); 