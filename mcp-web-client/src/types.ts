export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  workspaceId?: string;
  currentWorkingDirectory?: string;
}

export interface Workspace {
  id: string;
  name: string;
  rootPath: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  icon?: string;
  color?: string;
}

export interface McpServerConfig {
  command: string;
  args: string[];
  env?: Record<string, string>;
  disabled?: boolean;
}

export interface McpServerEntry {
  id: string;
  name: string;
  config: McpServerConfig;
  status?: 'disconnected' | 'connecting' | 'connected' | 'error';
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface McpConfig {
  mcpServers: Record<string, McpServerConfig>;
}
