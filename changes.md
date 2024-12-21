# Changes Log

## 2024-12-21 11:38:18 CST

Added Go language support to MCP Runner:
- Created new GoHandler class implementing the Handler interface
- Updated NodeHandler and PythonHandler to use the new Handler interface
- Added Go project detection in GitHub URL parser
- Added support for .go files and go.mod detection
- Refactored index.ts to use a unified handler approach
