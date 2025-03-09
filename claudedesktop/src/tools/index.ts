import {
  killClaudeTools,
  killClaude,
} from './kill-claude.js';

// Re-export everything
export * from './kill-claude.js';

// Combine all tool definitions
export const allTools = [
  ...killClaudeTools,
];

// Export all handlers
export const handlers = {
  kill_claude: killClaude,
} as const;

export type HandlerName = keyof typeof handlers;