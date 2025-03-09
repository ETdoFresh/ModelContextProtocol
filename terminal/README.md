# Terminal MCP Server

A secure Node.js server implementing Model Context Protocol (MCP) for terminal command execution.

## Features

- Execute terminal commands within allowed directories
- Security restrictions to prevent dangerous operations
- Manage allowed directories and current working directory

## Security Features

- Only allows command execution within explicitly allowed directories
- Blocks potentially dangerous commands
- Command sanitization to prevent injection attacks
- Execution timeouts to prevent long-running operations

## API

### Tools

- **execute_command**
  - Executes a command at the current working directory
  - Inputs:
    - `command` (string): The command to execute
    - `timeout` (number, optional): Maximum execution time in milliseconds (default: 10000)
  - Returns command output or error details

- **list_allowed_directories**
  - Lists directories the server is allowed to access
  - No inputs required

- **add_allowed_directory**
  - Adds a new directory to the allowed list
  - Input: `path` (string): Directory to add

- **remove_allowed_directory**
  - Removes a directory from the allowed list
  - Input: `path` (string): Directory to remove

- **get_cwd**
  - Returns the current working directory
  - No inputs required

- **change_cwd**
  - Changes the current working directory
  - Input: `path` (string): New working directory

## Building

```
npm install
npm run build
```

## Usage with Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "terminal": {
      "command": "node",
      "args": [
        "/path/to/terminal-mcp/dist/index.js",
        "/path/to/allowed/directory1",
        "/path/to/allowed/directory2"
      ]
    }
  }
}
```

## Warning

This server allows execution of terminal commands, which can be dangerous. Use with caution and only allow directories that are safe for command execution.

## License

This MCP server is licensed under the MIT License.