import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// --- Input Schema Definition ---
export const OpenRouterCompletionInputSchema = z.object({
  prompt: z.string().describe("*The user's prompt message [required]"),
  model: z.string().default("google/gemini-2.5-pro-preview-03-25").describe("The OpenRouter model identifier (default: google/gemini-2.5-pro-preview-03-25)"),
  temperature: z.number().min(0).max(2).optional().default(1.0).describe("Controls randomness (0.0 to 2.0, default: 1.0)"),
  // max_tokens: z.number().int().positive().optional().describe("Maximum number of tokens to generate")
});

// Type for the inferred input arguments
type OpenRouterCompletionInput = z.infer<typeof OpenRouterCompletionInputSchema>;

// --- Tool Handler Implementation ---
export async function openrouterCompletion(args: OpenRouterCompletionInput): Promise<CallToolResult> {
  const API_KEY = process.env.OPENROUTER_API_KEY;
  const API_URL = 'https://openrouter.ai/api/v1/chat/completions';
  const REFERRER = process.env.OPENROUTER_REFERRER || "mcp://server/openrouter"; // Default or from env
  const TITLE = "MCP Server - OpenRouter"; // Identify your app

  if (!API_KEY) {
    console.error("Error: OPENROUTER_API_KEY environment variable is not set.");
    return {
      content: [{ type: "text", text: "Configuration Error: OpenRouter API Key is missing on the server." }],
      isError: true,
    };
  }

  try {
    // Input `args` are already validated by the McpServer wrapper if schema is provided
    const params = args; // Directly use args as they are validated
    console.error(`Calling OpenRouter: Model=${params.model}, Temp=${params.temperature}`); // Log params to stderr

    const requestBody = {
      model: params.model,
      messages: [{ role: "user", content: params.prompt }],
      temperature: params.temperature,
      // max_tokens: params.max_tokens, // Uncomment if added
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'HTTP-Referer': REFERRER,
        'X-Title': TITLE,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      let errorBody = 'Unknown error';
      try {
        errorBody = await response.text();
        const errorJson = JSON.parse(errorBody);
        errorBody = errorJson.error?.message || JSON.stringify(errorJson);
      } catch (e) { /* Keep text body */ }
      console.error(`OpenRouter API Error (${response.status}): ${errorBody}`);
      return {
        content: [{ type: "text", text: `Error from OpenRouter API (${response.status}): ${errorBody}` }],
        isError: true,
      };
    }

    const data = await response.json();
    const responseContent = data.choices?.[0]?.message?.content;

    if (typeof responseContent !== 'string' || responseContent.trim() === '') {
      console.error("OpenRouter API returned success but no valid content found:", data);
      return {
        content: [{ type: "text", text: "Error: Empty or invalid response content received from OpenRouter." }],
        isError: true,
      };
    }

    console.error("OpenRouter call successful.");
    return {
      content: [{ type: "text", text: responseContent }],
    };

  } catch (error: any) {
    // Catch internal errors (e.g., network issues, unexpected issues)
    console.error(`Internal error processing OpenRouter request: ${error.message}`, error.stack);
    return {
      content: [{ type: "text", text: `Internal Server Error: ${error.message}` }],
      isError: true,
    };
  }
}

// --- Tool Definition for MCP ---
const inputSchemaJson = zodToJsonSchema(OpenRouterCompletionInputSchema, "OpenRouterCompletionInputSchema");


export const openrouterCompletionTool: Tool = {
  name: "call_openrouter",
  description: "Makes a chat completion request to the OpenRouter API using the specified model, prompt, and temperature.",
  inputSchema: inputSchemaJson as Tool['inputSchema'],
}; 