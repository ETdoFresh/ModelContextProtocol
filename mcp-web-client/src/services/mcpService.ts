import { McpConfig } from '../types';

// Store the MCP server information
let mcpServers: Record<string, any> = {};

// Load the MCP configuration
async function loadMcpConfig(): Promise<McpConfig> {
  try {
    console.log('Attempting to fetch MCP config from:', '/mcp_config.json');
    const response = await fetch('/mcp_config.json');
    console.log('MCP config fetch response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`Failed to load MCP configuration: ${response.status} ${response.statusText}`);
    }
    
    const config = await response.json();
    console.log('Successfully loaded MCP config:', config);
    return config;
  } catch (error) {
    console.error('Error loading MCP config:', error);
    // Return a default empty config instead of throwing
    return { mcpServers: {} };
  }
}

export async function setupMcpClients() {
  try {
    console.log('Setting up MCP clients...');
    const config = await loadMcpConfig();
    const { mcpServers: servers } = config;
    
    // Store the server configurations
    mcpServers = servers;
    
    if (Object.keys(mcpServers).length > 0) {
      console.log('MCP servers configured:', Object.keys(mcpServers));
    } else {
      console.warn('No valid MCP servers available after filtering');
    }
  } catch (error) {
    console.error('Error setting up MCP clients:', error);
  }
}

function startMcpServer(serverConfig: any) {
  // Implementation depends on how we want to spawn the server processes
  // This is a placeholder
  console.log('Starting MCP server with config:', serverConfig);
  
  // For now we're just returning a mock process
  return Promise.resolve({
    isRunning: true,
    stop: () => console.log('Stopping MCP server')
  });
}

export function getMcpClient(serverName: string): any | undefined {
  return mcpServers[serverName];
}

// For making MCP function calls
export async function callMcpFunction(
  serverName: string,
  functionName: string,
  parameters: any
) {
  const serverConfig = mcpServers[serverName];
  
  if (!serverConfig) {
    throw new Error(`MCP server ${serverName} not found in configuration`);
  }
  
  try {
    // In a real implementation, we would start the server process if needed
    // and communicate with it via HTTP
    
    // For now, we'll simulate a response
    console.log(`Calling ${serverName}.${functionName} with parameters:`, parameters);
    
    // This is a mock response - in a real implementation, we would make an HTTP request
    // to the MCP server
    return {
      status: 'success',
      server: serverName,
      function: functionName,
      result: `Simulated response from ${serverName}.${functionName}`,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`Error calling MCP function ${functionName}:`, error);
    throw error;
  }
}
