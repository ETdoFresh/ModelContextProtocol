declare module '@modelcontextprotocol/sdk' {
  export interface Tool {
    name: string;
    description: string;
    schema?: any;
  }

  export interface McpServerOptions {
    name: string;
    description: string;
    tools: Tool[];
    handlers: Record<string, Function>;
  }

  export interface McpServer {
    start(): Promise<void>;
  }

  export function createMcpServer(options: McpServerOptions): McpServer;
}
