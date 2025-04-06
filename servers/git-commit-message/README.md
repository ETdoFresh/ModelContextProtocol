# Git Commit Message Server

A server for git operations including diff viewing and commit message generation.

## Features

- Get the git diff for a repository
- Commit and push changes with a well-formatted commit message

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

## Usage

Start the server:

```bash
npm start
```

The server will run on port 3000 by default. You can change the port by setting the `PORT` environment variable.

## API Endpoints

### Get Git Diff

```
POST /get_diff
```

Request body:

```json
{
  "path": "/path/to/git/repository"
}
```

Response:

```json
{
  "diff": "diff --git a/file.txt b/file.txt\nindex 1234567..abcdefg 100644\n--- a/file.txt\n+++ b/file.txt\n@@ -1,3 +1,4 @@\n Line 1\n Line 2\n+New line\n Line 3"
}
```

### Commit and Push Changes

```
POST /commit_and_push
```

Request body:

```json
{
  "path": "/path/to/git/repository",
  "commit_message": "Add new feature"
}
```

Response:

```json
{
  "message": "Successfully committed and pushed changes with message: \"Add new feature\""
}
```

## Commit Message Rules

The commit message MUST follow these rules:

- Use present tense (e.g. "Add feature" not "Added feature")
- Start with a capital letter
- Do not include any prefixes (like "feat:", "fix:", "Initial commit:", etc.)
- Be descriptive but concise
- For multi-line messages, use dashes (-) for bullet points if necessary
- Generate ONLY the commit message, nothing else.

## Integration with MCP

This server can be integrated with the Model Context Protocol (MCP) by creating a wrapper that adapts the REST API to the MCP protocol. The wrapper would need to:

1. Implement the MCP server interface
2. Expose the git operations as MCP tools
3. Translate between MCP tool calls and REST API requests

## License

MIT