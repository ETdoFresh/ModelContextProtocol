#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import open from 'open';
import path from 'path';
import os from 'os';

class ClaudeSettingsServer {
  constructor() {
    this.server = new Server(
      {
        name: 'claude-settings',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  getSettingsPath() {
    const platform = os.platform();
    const home = os.homedir();

    if (platform === 'win32') {
      return path.join(home, 'AppData', 'Local', 'Claude', 'claude_desktop_config.json');
    } else if (platform === 'darwin') {
      return path.join(home, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    } else {
      throw new Error('Unsupported operating system');
    }
  }

  setupTools() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'open_settings',
          description: 'Open Claude Desktop MCP settings file in default editor',
          inputSchema: {
            type: 'object',
            properties: {},
            required: [],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      if (request.params.name !== 'open_settings') {
        return {
          content: [
            {
              type: 'text',
              text: `Unknown tool: ${request.params.name}`,
            },
          ],
          isError: true,
        };
      }

      try {
        const settingsPath = this.getSettingsPath();
        await open(settingsPath);

        return {
          content: [
            {
              type: 'text',
              text: `Opened Claude Desktop settings file: ${settingsPath}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error opening settings: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Claude Settings MCP server running on stdio');
  }
}

const server = new ClaudeSettingsServer();
server.run().catch(console.error);
