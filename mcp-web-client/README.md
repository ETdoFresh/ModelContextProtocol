# MCP Web Chat Interface

An elegant web chat interface that connects to OpenRouter.ai's Gemini model and supports Model Context Protocol (MCP) servers.

## Features

- Modern, responsive UI for chat interactions
- Integration with OpenRouter.ai's `google/gemini-2.0-flash-001` model
- Support for Model Context Protocol (MCP) servers
- Markdown rendering for assistant messages
- Real-time chat with loading indicators

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

4. Create a `.env` file based on `.env.example` and add your OpenRouter API key:

```
OPENROUTER_API_KEY=your_openrouter_api_key_here
```

5. Update the `mcp_config.json` file with your MCP server configurations.

### Development

Start the development server:

```bash
npm start
```

This will open the application in your default browser at `http://localhost:3000`.

### Building for Production

Create a production build:

```bash
npm run build
```

The build artifacts will be stored in the `dist/` directory.

## Using MCP Commands

You can interact with MCP servers directly from the chat interface using the following syntax:

```
/mcp serverName.functionName(parameters)
```

For example:

```
/mcp github.getRepositories()
```

## Project Structure

```
mcp-web-client/
├── public/              # Static assets
├── src/                 # Source files
│   ├── components/      # React components
│   ├── services/        # API and MCP services
│   ├── styles/          # CSS styles
│   ├── utils/           # Utility functions
│   ├── index.tsx        # Entry point
│   └── types.ts         # TypeScript types
├── .env.example         # Example environment variables
├── mcp_config.json      # MCP server configurations
├── package.json         # Dependencies and scripts
├── tsconfig.json        # TypeScript configuration
└── webpack.config.js    # Webpack configuration
```

## License

MIT
