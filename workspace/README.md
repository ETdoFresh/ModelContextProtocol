# Workspace MCP Server

A Model Context Protocol (MCP) server that wraps various other MCP servers (terminal, git, etc.) while tracking the current working directory.

## Features

- Tracks the current working directory (CWD) across tool calls
- Provides `cd` and `pwd` tools for directory management
- Automatically forwards requests to the appropriate underlying MCP servers
- Injects the current working directory into forwarded requests when needed

## Installation

```bash
npm install
npm run build
```

## Usage

The workspace MCP server provides two main tools:

1. `cd`: Change the current working directory
   ```json
   {
     "name": "cd",
     "arguments": {
       "path": "/path/to/directory"
     }
   }
   ```

2. `pwd`: Print the current working directory
   ```json
   {
     "name": "pwd",
     "arguments": {}
   }
   ```

All other tool requests are forwarded to the appropriate underlying MCP server with the current working directory injected when needed:

- Terminal commands (`execute_command`) will include the CWD as the `cwd` parameter
- Git commands will include the CWD as the `repoPath` parameter

## Architecture

The workspace MCP server uses a singleton state manager to track the current working directory. When a tool request is received, it checks if it's a direct tool (`cd` or `pwd`) or if it should be forwarded to another MCP server.

When forwarding requests, it automatically injects the current working directory into the request parameters if not already specified.

## Development

```bash
npm install
npm run build
npm start
```

## License

MIT
