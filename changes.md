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
