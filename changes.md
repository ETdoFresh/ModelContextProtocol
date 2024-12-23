# Changes Log

## 2024-12-21 21:51:41 CST

Add Windsurf rules and update CLI rules
{{ ... }}

## 2024-12-21 18:37:00 CST

Update .clinerules guidelines:
- Add explicit guideline to preserve complete change history
- Reinforce requirement to never delete existing logs

## 2024-12-21 18:35:00 CST

Fix Windows settings path:
- Update Windows path to use AppData/Roaming instead of AppData/Local
- Update documentation with correct Windows path
- Fix path in server implementation

## 2024-12-21 18:30:00 CST

Add claude-settings documentation:
- Create README.md with features and installation instructions
- Document both mcp-runner and manual installation methods
- Add usage examples and development details

## 2024-12-21 18:27:00 CST

Fix claude-settings MCP server:
- Update @modelcontextprotocol/sdk to version 0.5.0
- Fix dependency version mismatch error

## 2024-12-21 18:25:00 CST

Update claude-settings MCP configuration:
- Switch to using mcp-runner command
- Configure to load server directly from GitHub repository
- Update both Claude Desktop and Cline MCP settings

## 2024-12-21 18:21:00 CST

Add cross-platform claude-settings MCP server:
- Created server to open Claude Desktop MCP settings in default editor
- Implemented support for both Windows and Mac paths
- Added open_settings tool using @modelcontextprotocol/sdk
- Configured for both Claude Desktop and Cline MCP

## 2024-12-21 12:44:51 CST

Update changes.md and .clinerules:
- Reversed order of changes.md to show newest changes at top
- Added guideline in .clinerules to specify newest changes should be at top
- Fixed guidelines tag closing in .clinerules

## 2024-12-21 12:42:33 CST

Updated .clinerules file:
- Modified trigger conditions for rules to be more specific
- Added "File Changes Made" condition to Get Local Time rule
- Added "File Changes Made" condition to Log Changes rule
- Added "File Changes Made" condition to Git Commit and Push rule

## 2024-12-21 12:16:25 CST

Improved mcp-ignore server:
- Added esbuild for bundling ES modules into single file
- Successfully built executable with pkg
- Cleaned up unused files and configurations
- Verified bundled executable works correctly

## 2024-12-21 12:10:30 CST

Fixed mcp-ignore server:
- Updated to use ES modules properly
- Set SDK version to 0.5.0 for compatibility
- Simplified package configuration
- Verified server runs successfully

## 2024-12-21 11:57:56 CST

Created mcp-ignore server:
- Basic TypeScript project setup with necessary dependencies
- Implemented IgnoreServer class that returns zero functions
- Added build configuration and npm scripts
- Server connects to stdio transport but provides no capabilities (tools or resources)

## 2024-12-21 11:46:00 CST

Built MCP Runner with Go support:
- Successfully compiled TypeScript code
- Created executable (40.6 MB) with pkg
- Verified executable creation in bin directory

## 2024-12-21 11:38:18 CST

Added Go language support to MCP Runner:
- Created new GoHandler class implementing the Handler interface
- Updated NodeHandler and PythonHandler to use the new Handler interface
- Added Go project detection in GitHub URL parser
- Added support for .go files and go.mod detection
- Refactored index.ts to use a unified handler approach
