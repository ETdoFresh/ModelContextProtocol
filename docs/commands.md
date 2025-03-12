# Command Documentation

This document provides information about the special commands supported by the ModelContextProtocol chat interface. These commands allow you to interact with the workspace, navigate the file system, and use MCP tool calls.

## Navigation Commands

### `cd` - Change Directory

The `cd` command allows you to navigate through the workspace directory structure.

#### Usage

```
cd <directory_path>
```

#### Examples

```
cd myProject           # Navigate to a subdirectory
cd ..                  # Navigate to the parent directory
cd /                   # Navigate to the workspace root
cd ~/documents         # Navigate to documents folder from root
cd ./src/components    # Navigate to a relative path
```

#### Options

- `..` - Navigate to the parent directory
- `/` - Navigate to the workspace root
- `~/` or `$HOME/` - Reference the workspace root
- `.` - Reference the current directory

#### Error Handling

- If the specified directory doesn't exist, an error message will be displayed.
- Attempting to navigate outside the workspace boundaries will result in an error.

## File Operations

### `ls` - List Directory Contents

Lists files and directories in the current working directory.

#### Usage

```
ls [options] [directory]
```

#### Examples

```
ls                     # List files in current directory
ls -a                  # Show all files including hidden ones
ls -l                  # Show detailed file information
ls ./src               # List files in the src directory
```

#### Options

- `-a` - Show all files, including hidden files
- `-l` - Show detailed file information (permissions, size, modified date)

## MCP Tool Calls

MCP (Model Context Protocol) tool calls allow the AI assistant to interact with external systems and services. These calls follow a specific syntax and are processed by the MCP server.

### Syntax

MCP tool calls use the following syntax:

```
<mcp:toolName>
parameter1: value1
parameter2: value2
</mcp>
```

### Examples

#### File Operations Example

```
<mcp:readFile>
path: ./src/App.js
</mcp>
```

#### Create File Example

```
<mcp:writeFile>
path: ./notes.txt
content: This is a note created using an MCP tool call.
</mcp>
```

### Available Tools

The actual tools available depend on the connected MCP servers. Some common tools include:

- `readFile` - Read file contents
- `writeFile` - Create or update a file
- `listFiles` - List files in a directory
- `createDirectory` - Create a new directory
- `deleteFile` - Delete a file
- `execute` - Execute a shell command

### Error Handling

If an MCP tool call fails, an error message will be displayed with information about the issue. Common errors include:

- Invalid tool name
- Missing required parameters
- Permission denied
- File not found
- Syntax errors in the tool call

## Client Variables

Client variables provide context for commands and tool calls. They can be referenced in commands using `$variableName`.

### Common Variables

- `$CWD` - Current working directory
- `$WORKSPACE` - Current workspace root
- `$HOME` - Same as $WORKSPACE

### Example Usage

```
cd $CWD/src
<mcp:readFile>
path: $WORKSPACE/package.json
</mcp>
```

## Tips and Best Practices

1. **Use Tab Completion**: The interface supports tab completion for paths and commands.
2. **Check Command Status**: After executing a command, check for success or error messages.
3. **Use Relative Paths**: When possible, use relative paths for clarity.
4. **Inspect Before Modifying**: Always use `ls` or equivalent to verify the contents before file operations.
5. **Use Workspace Variables**: Leverage client variables to make commands more portable.

## Quick Reference

| Command | Description | Example |
|---------|-------------|---------|
| `cd` | Change directory | `cd ./src` |
| `ls` | List directory contents | `ls -a` |
| `<mcp:toolName>` | Execute an MCP tool | `<mcp:readFile>` |

For more detailed information about specific MCP tools, consult the MCP server documentation or use the help command for the specific tool.
