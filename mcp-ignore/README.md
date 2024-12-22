# MCP Ignore Server

A cross-platform MCP server that returns zero functions. Useful for testing MCP server connections or as a template for building new MCP servers.

## Features

- Implements a minimal MCP server with no capabilities
- Returns empty tools and resources
- Properly handles stdio transport and error handling
- Cross-platform support
- Available as both a Node.js module and standalone executable

## Installation

### Using mcp-runner (Recommended)

Add this to your Claude Desktop config (`claude_desktop_config.json`) or Cline MCP settings:

```json
{
  "mcpServers": {
    "mcp-ignore": {
      "command": "mcp-runner",
      "args": ["https://github.com/ETdoFresh/ModelContextProtocol/tree/main/mcp-ignore"]
    }
  }
}
```

### Using the Executable

1. Download the latest executable from the releases page
2. Add to your MCP settings:
```json
{
  "mcpServers": {
    "mcp-ignore": {
      "command": "path/to/mcp-ignore.exe"
    }
  }
}
```

### Manual Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Add to your MCP settings:
```json
{
  "mcpServers": {
    "mcp-ignore": {
      "command": "node",
      "args": ["path/to/mcp-ignore/dist/bundle.cjs"]
    }
  }
}
```

## Development

This server is built using:
- Node.js
- @modelcontextprotocol/sdk v0.5.0
- ES Modules
- esbuild for bundling
- pkg for executable creation

### Build Scripts

- `npm run build` - Build TypeScript files
- `npm run bundle` - Bundle into single CommonJS file
- `npm run build:exe` - Create standalone executable

## Usage

Once configured, the server will connect to Claude but provide no capabilities. This is useful for:
- Testing MCP server connections
- Understanding the basic structure of an MCP server
- Using as a template for building new MCP servers
