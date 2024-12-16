# MCP Runner

A command-line tool to run MCP servers directly from GitHub URLs. It automatically detects if the project is Node.js or Python, handles installation, and runs the server.

## Installation

```bash
# Clone the repository
git clone [your-repo-url]
cd mcp-runner

# Install dependencies
npm install

# Build the project
npm run build

# Link globally
npm link
```

## Usage

```bash
mcp-runner <github-url> [options]
```

### Options

- `-d, --dir <directory>`: Target directory for installation (default: "mcp-servers")
- `-a, --args <args...>`: Additional arguments to pass to the server

### Examples

1. Run a Node.js MCP server (filesystem):
```bash
mcp-runner https://github.com/modelcontextprotocol/servers/tree/main/src/filesystem --args .
```

2. Run a Python MCP server (time) with timezone:
```bash
mcp-runner https://github.com/modelcontextprotocol/servers/tree/main/src/time --args --local-timezone America/Chicago
```

## Features

- Automatic project type detection (Node.js/Python)
- Git repository cloning and updating
- Dependency installation
- Virtual environment creation for Python projects
- Automatic entry point detection
- Pass-through arguments to the server

## Project Type Detection

The tool detects the project type based on:
- File extension for single files (.js/.ts for Node.js, .py for Python)
- Presence of package.json for Node.js projects
- Presence of requirements.txt or pyproject.toml for Python projects

## Directory Structure

When you run an MCP server, it will:
1. Create a directory (default: mcp-servers) if it doesn't exist
2. Clone the repository inside that directory
3. Install dependencies and set up the environment
4. Run the server with any provided arguments

## Error Handling

The tool provides informative error messages for common issues:
- Invalid GitHub URLs
- Missing dependencies
- Build failures
- Runtime errors

## Development

To modify the tool:

1. Make changes to the TypeScript files in `src/`
2. Rebuild with `npm run build`
3. Test your changes with `npm start`
