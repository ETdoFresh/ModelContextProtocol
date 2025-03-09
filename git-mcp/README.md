# Git MCP Server

A Node.js server implementing Model Context Protocol (MCP) for Git operations.

## Features

- Show diff of uncommitted changes
- Commit changes with formatted commit messages
- Push commits to remote repositories

## API

### Tools

- **git_diff**
  - Show changes between commits, commit and working tree
  - Inputs:
    - `path` (string, optional): Specific file or directory to check
    - `cached` (boolean, optional): Show staged changes (default: false)
  - Returns the git diff output

- **git_commit**
  - Commit all changes with a properly formatted message
  - Inputs:
    - `message` (string): Commit message following the style rules
  - The commit message should follow these rules:
    - Use present tense ("Add feature" not "Added feature")
    - Start with capital letter
    - No prefixes (like "feat:", "fix:", "Initial commit:", etc.)
    - Be descriptive but concise
    - Use dashes (-) for bullet points in multi-line messages

- **git_push**
  - Push local commits to a remote repository
  - Inputs:
    - `remote` (string, optional): Remote repository name (default: "origin")
    - `branch` (string, optional): Branch name to push (defaults to current branch)
    - `force` (boolean, optional): Force push (use with caution, default: false)
  - Returns the result of the push operation

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
    "git": {
      "command": "node",
      "args": [
        "/path/to/git-mcp/dist/index.js",
        "/path/to/your/git/repository"
      ]
    }
  }
}
```

## License

This MCP server is licensed under the MIT License.