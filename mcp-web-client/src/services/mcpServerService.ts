import { McpServerEntry, McpServerConfig } from '../types';

// Local storage key for MCP servers
const MCP_SERVERS_KEY = 'mcp-servers';

// Helper function to convert string dates back to Date objects
const parseDates = (server: any): McpServerEntry => {
  return {
    ...server,
    createdAt: new Date(server.createdAt),
    updatedAt: new Date(server.updatedAt)
  };
};

// Get all MCP servers from local storage
export const getMcpServers = (): McpServerEntry[] => {
  const serversJson = localStorage.getItem(MCP_SERVERS_KEY);
  
  if (!serversJson) {
    return [];
  }
  
  try {
    const parsedServers = JSON.parse(serversJson);
    // Convert string dates back to Date objects
    return parsedServers.map(parseDates);
  } catch (error) {
    console.error('Error parsing MCP servers:', error);
    return [];
  }
};

// Save all MCP servers to local storage
export const saveMcpServers = (servers: McpServerEntry[]): void => {
  localStorage.setItem(MCP_SERVERS_KEY, JSON.stringify(servers));
};

// Create a new MCP server
export const createMcpServer = (name: string, config: McpServerConfig): McpServerEntry => {
  const servers = getMcpServers();
  
  const newServer: McpServerEntry = {
    id: Date.now().toString(),
    name,
    config,
    status: 'disconnected',
    enabled: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  // Save the new server
  saveMcpServers([...servers, newServer]);
  
  return newServer;
};

// Get a specific MCP server by ID
export const getMcpServerById = (id: string): McpServerEntry | undefined => {
  const servers = getMcpServers();
  return servers.find(server => server.id === id);
};

// Update an MCP server
export const updateMcpServer = (updatedServer: McpServerEntry): void => {
  const servers = getMcpServers();
  const index = servers.findIndex(server => server.id === updatedServer.id);
  
  if (index !== -1) {
    // Update the server with the new data and update timestamp
    servers[index] = {
      ...updatedServer,
      updatedAt: new Date()
    };
    saveMcpServers(servers);
  }
};

// Delete an MCP server
export const deleteMcpServer = (id: string): void => {
  try {
    // Get raw data from localStorage first
    const rawData = localStorage.getItem(MCP_SERVERS_KEY);
    
    if (!rawData) {
      return;
    }
    
    // Parse the raw data
    const rawServers = JSON.parse(rawData);
    
    // Filter out the server to delete
    const filteredServers = rawServers.filter((server: any) => String(server.id) !== String(id));
    
    // Save the filtered servers back to localStorage
    localStorage.setItem(MCP_SERVERS_KEY, JSON.stringify(filteredServers));
  } catch (error) {
    console.error('Error in deleteMcpServer:', error);
  }
};

// Toggle the enabled state of an MCP server
export const toggleMcpServerEnabled = (id: string): McpServerEntry | undefined => {
  const servers = getMcpServers();
  const index = servers.findIndex(server => server.id === id);
  
  if (index !== -1) {
    // Toggle the enabled state
    servers[index].enabled = !servers[index].enabled;
    servers[index].updatedAt = new Date();
    saveMcpServers(servers);
    return servers[index];
  }
  
  return undefined;
};

// Initialize with default MCP server if none exist
export const initializeMcpServers = (): void => {
  const servers = getMcpServers();
  
  if (servers.length === 0) {
    // Add default GitHub MCP server
    createMcpServer('GitHub', {
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: { 'GITHUB_PERSONAL_ACCESS_TOKEN': '<YOUR_TOKEN>' }
    });
  }
};

// Export MCP servers to config format
export const exportMcpConfig = (): Record<string, McpServerConfig> => {
  const servers = getMcpServers();
  const config: Record<string, McpServerConfig> = {};
  
  servers.forEach(server => {
    if (server.enabled) {
      config[server.name.toLowerCase()] = server.config;
    }
  });
  
  return config;
};

// Import MCP servers from config format
export const importMcpConfig = (config: Record<string, McpServerConfig>): void => {
  const servers: McpServerEntry[] = [];
  
  Object.entries(config).forEach(([name, serverConfig]) => {
    servers.push({
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      name,
      config: serverConfig,
      status: 'disconnected',
      enabled: serverConfig.enabled !== false, // Default to true if not specified
      createdAt: new Date(),
      updatedAt: new Date()
    });
  });
  
  saveMcpServers(servers);
};
