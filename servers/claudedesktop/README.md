# Claude Desktop Control MCP Server

A Node.js server implementing Model Context Protocol (MCP) for controlling Claude desktop application processes.

## Features

- Kill running Claude desktop processes

## API

### Resources

- `claudedesktop://system`: Claude desktop control interface

### Tools

- **kill_claude**
  - Terminates any running Claude desktop application processes
  - Input:
    - `force` (boolean, optional): Force kill the process if true (default: false)
  - Returns detailed results of the operation

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
    "claudedesktop": {
      "command": "node",
      "args": [
        "/path/to/claudedesktop/dist/index.js"
      ]
    }
  }
}
```

## License

This MCP server is licensed under the MIT License.