# Changes Log

## 2024-12-21 11:38:18 CST

Added Go language support to MCP Runner:
- Created new GoHandler class implementing the Handler interface
- Updated NodeHandler and PythonHandler to use the new Handler interface
- Added Go project detection in GitHub URL parser
- Added support for .go files and go.mod detection
- Refactored index.ts to use a unified handler approach

## 2024-12-21 11:46:00 CST

Built MCP Runner with Go support:
- Successfully compiled TypeScript code
- Created executable (40.6 MB) with pkg
- Verified executable creation in bin directory

## 2024-12-21 11:57:56 CST

Created mcp-ignore server:
- Basic TypeScript project setup with necessary dependencies
- Implemented IgnoreServer class that returns zero functions
- Added build configuration and npm scripts
- Server connects to stdio transport but provides no capabilities (tools or resources)

## 2024-12-21 12:10:30 CST

Fixed mcp-ignore server:
- Updated to use ES modules properly
- Set SDK version to 0.5.0 for compatibility
- Simplified package configuration
- Verified server runs successfully

## 2024-12-21 12:16:25 CST

Improved mcp-ignore server:
- Added esbuild for bundling ES modules into single file
- Successfully built executable with pkg
- Cleaned up unused files and configurations
- Verified bundled executable works correctly
