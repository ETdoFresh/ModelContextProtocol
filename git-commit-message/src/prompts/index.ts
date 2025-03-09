import { Prompt } from '@modelcontextprotocol/sdk/types.js';
import { gitWorkflowPrompt } from './git-workflow.js';

// Export all prompts
export const allPrompts: Prompt[] = [
  gitWorkflowPrompt
];

// Type for prompt handlers
export type PromptName = 'git-workflow';

// Export prompt handlers
export const promptHandlers: Record<PromptName, (args?: Record<string, any>) => Promise<any>> = {
  'git-workflow': gitWorkflowPrompt.handler
};
