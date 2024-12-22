# Claude Settings MCP Server

A cross-platform MCP server that provides a tool to open Claude Desktop MCP settings in your default editor.

## Features

- Opens Claude Desktop MCP settings file in your default editor
- Cross-platform support for both Windows and Mac
- Automatically detects the correct settings file location:
  - Windows: `%USERPROFILE%\AppData\Roaming\Claude\claude_desktop_config.json`
  - Mac: `~/Library/Application Support/Claude/claude_desktop_config.json`

## Installation

### Using mcp-runner (Recommended)

Add this to your Claude Desktop config (`claude_desktop_config.json`) or Cline MCP settings:

```json
{
  "mcpServers": {
    "claude-settings": {
      "command": "mcp-runner",
      "args": ["https://github.com/ETdoFresh/ModelContextProtocol/tree/main/claude-settings"]
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
    "claude-settings": {
      "command": "node",
      "args": ["path/to/claude-settings/index.js"]
    }
  }
}
```

## Usage

Once configured, you can use the `open_settings` tool through Claude to open your MCP settings file:

```
Use the open_settings tool to open my Claude Desktop MCP settings
```

The settings file will open in your system's default editor.

## Development

This server is built using:
- Node.js
- @modelcontextprotocol/sdk v0.5.0
- ES Modules
