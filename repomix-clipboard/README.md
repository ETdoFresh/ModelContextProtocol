# Repomix Clipboard MCP Server

A dynamic MCP server that forwards all tools from the repomix MCP server. This server automatically discovers all available tools from the repomix MCP server and makes them available through its own interface.

## Features

- Automatically starts a repomix MCP server as a child process
- Dynamically discovers all available tools from the repomix server
- Forwards all requests to the repomix server
- Provides the same tools and functionality as the original repomix MCP server

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

```bash
# Start the server
node dist/index.js
```

Or you can run it directly using:

```bash
npx repomix-clipboard
```

## Available Tools

The server dynamically forwards all tools available in the repomix MCP server, which typically include:

- `pack_codebase`: Package a local code directory into a consolidated file for AI analysis
- `pack_remote_repository`: Fetch, clone and package a GitHub repository
- `read_repomix_output`: Read the contents of a Repomix output file

## How it Works

When started, the server:

1. Launches a repomix MCP server as a child process
2. Discovers all available tools from the repomix server
3. Creates forwarding handlers for each tool
4. Starts its own MCP server that exposes the same tools
5. Forwards all requests to the underlying repomix server

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run the server
npm start
```
