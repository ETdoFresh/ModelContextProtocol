#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

class IgnoreServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-ignore',
        version: '1.0.0',
      },
      {
        capabilities: {
          // Return empty capabilities - no tools or resources
          resources: {},
          tools: {},
        },
      }
    );

    // Error handling
    this.server.onerror = (error: unknown) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('MCP ignore server running on stdio');
  }
}

const server = new IgnoreServer();
server.run().catch(console.error);
