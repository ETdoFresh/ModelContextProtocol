#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { allTools, handlers, HandlerName } from "./tools/index.js";
import { allPrompts, promptHandlers, PromptName } from "./prompts/index.js";

// Create the MCP server
const server = new Server(
  {
    name: "git-commit-message",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
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

// Handler to list all available prompts
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: allPrompts };
});

// Handler to get a prompt by name
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  try {
    const { name, arguments: promptArgs } = request.params;
    const handler = promptHandlers[name as PromptName];
    if (!handler) {
      throw new Error(`Unknown prompt: ${name}`);
    }
    return await handler(promptArgs);
  } catch (error: any) {
    throw new Error(`Error getting prompt: ${error.message}`);
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