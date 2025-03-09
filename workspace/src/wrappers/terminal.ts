import WorkspaceState from '../state.js';

/**
 * Forward a request to the terminal MCP server
 * @param name The name of the tool being called
 * @param args The arguments for the tool
 * @returns The result from the terminal MCP server
 */
export async function forwardToTerminal(name: string, args: any) {
  // Get the current working directory
  const state = WorkspaceState.getInstance();
  
  // For execute_command, add the current working directory if not specified
  if (name === 'execute_command' && !args.cwd) {
    args = {
      ...args,
      cwd: state.getCwd()
    };
  }
  
  // Here we would normally forward the request to the terminal MCP server
  // For now, we'll simulate the forwarding by returning a descriptive message
  return {
    content: [{ 
      type: "text", 
      text: `[TERMINAL FORWARDING] Would execute '${name}' with args: ${JSON.stringify(args)}` 
    }]
  };
  
  // In a real implementation, this would call the actual terminal MCP server
  // return await terminalMcpClient.callTool(name, args);
}
