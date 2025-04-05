#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import type { Tool, CallToolResult, ListToolsRequest, ListToolsResult, CallToolRequest, CallToolRequestSchema, CallToolResultSchema, ClientRequest } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { zodToJsonSchema } from 'zod-to-json-schema';
import { spawn, execSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs'; // Import existsSync

// --- Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Relative paths to the other servers based on the requested structure
const openRouterServerPath = path.resolve(__dirname, '../../openrouter/dist/server.js');
const repopackServerPath = path.resolve(__dirname, '../../repopack/dist/index.js');

const REPOROUTER_SERVER_NAME = "reporouter";
const REPOROUTER_SERVER_VERSION = "0.1.0";
const OPENROUTER_TARGET_ID = "openrouter-target"; // Internal ID for the client connection
const REPOPACK_TARGET_ID = "repopack-target";   // Internal ID for the client connection

// --- Helper: Log to stderr ---
const logError = (...args: any[]) => console.error(`[${REPOROUTER_SERVER_NAME}]`, ...args);

// --- Client Setup ---

// Function to spawn a target MCP server process
const spawnServerProcess = (serverPath: string, serverName: string) => {
    logError(`Spawning ${serverName} server process from: ${serverPath}`);
    // Check if the path exists before spawning
    if (!existsSync(serverPath)) { // Use existsSync for a simple check
         logError(`Error: Server file not found for ${serverName}: ${serverPath}. Make sure the target server is built.`);
         throw new Error(`Server file not found for ${serverName}: ${serverPath}`);
    }

    // Determine the directory of the server script to set the CWD
    const serverDirectory = path.dirname(serverPath);
    logError(`Setting CWD for ${serverName} to: ${serverDirectory}`);

    // Use 'node' to execute the JS file. Adjust if the target servers are bundled differently.
    const childProcess = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'], // Use pipe for stdin, stdout, stderr
        cwd: serverDirectory // Set the current working directory for the child process
    });

    childProcess.stderr?.on('data', (data) => {
        logError(`[${serverName} stderr]: ${data.toString().trim()}`);
    });

    childProcess.on('error', (err) => {
        logError(`Error spawning ${serverName} server:`, err);
    });

    childProcess.on('exit', (code, signal) => {
        logError(`${serverName} server process exited with code ${code}, signal ${signal}`);
    });

    return childProcess;
};

// Create clients for the target servers
const openRouterClient = new Client({ name: `${REPOROUTER_SERVER_NAME}-client-for-openrouter`, version: REPOROUTER_SERVER_VERSION });
const repopackClient = new Client({ name: `${REPOROUTER_SERVER_NAME}-client-for-repopack`, version: REPOROUTER_SERVER_VERSION });

// --- Tool Definition for RepoRouter ---

// Define the input schema for the combined tool
const CodebaseChatInputSchema = z.object({
  directory: z.string().describe("*Absolute path to the code directory. [required]"),
  user_prompt: z.string().describe("*The user's question or instruction related to the codebase. [required]"),
  model: z.string().optional().default("google/gemini-2.5-pro-preview-03-25").describe("*OpenRouter model identifier. [optional]"),
  // Repopack options (mirroring repopack's pack_codebase, excluding outputTarget/Format as we handle that)
  includePatterns: z.string().optional().describe("Comma-separated glob patterns for files to include. [optional]"),
  ignorePatterns: z.string().optional().describe("Comma-separated glob patterns to ignore. [optional]"),
  removeComments: z.boolean().optional().default(false).describe("Remove comments from code. [optional]"),
  removeEmptyLines: z.boolean().optional().default(false).describe("Remove empty lines from code. [optional]"),
  fileSummary: z.boolean().optional().default(false).describe("Include repopack summary in context (reduces token space). [optional]"),
  directoryStructure: z.boolean().optional().default(false).describe("Include repopack directory structure in context (reduces token space). [optional]"),
  noGitignore: z.boolean().optional().default(false).describe("Exclude .gitignore from context. [optional]"),
  noDefaultPatterns: z.boolean().optional().default(false).describe("Exclude default patterns from context. [optional]"),
  // OpenRouter options (mirroring openrouter's call_openrouter, excluding the main prompt)
  temperature: z.number().min(0).max(2).optional().default(1.0).describe("LLM temperature. [optional]"),
});

// --- Tool Handler Implementation ---

async function handleCodebaseChat(args: z.infer<typeof CodebaseChatInputSchema>): Promise<CallToolResult> {
  logError("Handling codebase_chat request...");

  try {
    // 1. Prepare args for Repopack
    const repopackArgs = {
      directory: args.directory,
      includePatterns: args.includePatterns,
      ignorePatterns: args.ignorePatterns,
      removeComments: args.removeComments,
      removeEmptyLines: args.removeEmptyLines,
      fileSummary: args.fileSummary, // Pass through
      directoryStructure: args.directoryStructure, // Pass through
      noGitignore: args.noGitignore,
      noDefaultPatterns: args.noDefaultPatterns,
      outputFormat: 'txt', // Request simple text format for context
      outputTarget: 'stdout', // We need the content directly
    };

    logError("Calling repopack/pack_codebase with args:", repopackArgs);

    // 2. Call Repopack Server using the callTool helper
    const repopackResult = await repopackClient.callTool(
        { name: "pack_codebase", arguments: repopackArgs } as CallToolRequest['params']
        // No resultSchema needed, defaults to CallToolResultSchema
        // No options needed
    ) as CallToolResult; // Result should match CallToolResult by default

    logError("Repopack call completed.");

    // Validate Repopack Result (ensure it's a valid object before accessing properties)
    if (typeof repopackResult !== 'object' || repopackResult === null) {
      logError('Invalid response type from repopack');
      return { content: [{ type: "text", text: '<error>Invalid response type from repopack</error>' }], isError: true };
    }

    // Now safely cast and check properties
    const repopackCallResult = repopackResult as CallToolResult;
    if (repopackCallResult.isError || !repopackCallResult.content || !Array.isArray(repopackCallResult.content) || repopackCallResult.content.length === 0 || repopackCallResult.content[0]?.type !== 'text' || typeof repopackCallResult.content[0].text !== 'string') {
       const errorDetail = repopackCallResult.isError ? (repopackCallResult.content?.[0]?.text || 'Unknown repopack error') : 'Invalid content type or structure from repopack';
       logError(`Repopack error: ${errorDetail}`);
      return {
        content: [{ type: "text", text: `<error>Failed to get codebase from repopack: ${errorDetail}</error>` }],
        isError: true,
      };
    }

    const codebaseContext = repopackCallResult.content[0].text;
    logError(`Received codebase context (${codebaseContext.length} chars).`);

    // 3. Construct Prompt for OpenRouter
    const finalPrompt = `Analyze the following codebase context and answer the user's query.

Codebase Context:
\\\`\\\`\\\`text
${codebaseContext}
\\\`\\\`\\\`

User Query:
${args.user_prompt}`;

    // 4. Prepare args for OpenRouter
    const openrouterArgs = {
      prompt: finalPrompt,
      model: args.model,
      temperature: args.temperature,
    };

    logError(`Calling openrouter/call_openrouter with model ${args.model}...`);

    // 5. Call OpenRouter Server using the callTool helper
    const openrouterResult = await openRouterClient.callTool(
        { name: "call_openrouter", arguments: openrouterArgs } as CallToolRequest['params']
        // No resultSchema needed, defaults to CallToolResultSchema
        // No options needed
    ) as CallToolResult; // Result should match CallToolResult by default

    logError("OpenRouter call completed.");

    // 6. Return OpenRouter's result (add validation)
    if (typeof openrouterResult !== 'object' || openrouterResult === null) {
      logError('Invalid response type from OpenRouter');
      return { content: [{ type: "text", text: '<error>Invalid response type from OpenRouter</error>' }], isError: true };
    }

    // Cast and process
    const openrouterCallResult = openrouterResult as CallToolResult;
    if (!Array.isArray(openrouterCallResult.content)) {
      logError('OpenRouter result content is not an array, wrapping.');
      openrouterCallResult.content = [{ type: 'text', text: String(openrouterCallResult.content ?? '') }];
    }

    return openrouterCallResult;

  } catch (error: unknown) { // Use unknown for better type safety
    // Ensure error is an Error object for message and stack
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logError(`Error in codebase_chat handler: ${errorObj.message}`, errorObj.stack);
    let errorMessage = `Error processing codebase chat request: ${errorObj.message}`;

     if (error instanceof z.ZodError) {
         errorMessage = `Invalid input: ${error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
     } else if (errorObj.message?.includes('Connection not established')) {
         errorMessage = `Error: Could not connect to a required backend server (${errorObj.message})`;
     }
     // Check if it's a structured error from the client request (less common with direct request method)
     else if (typeof error === 'object' && error !== null && 'method' in error && 'code' in error && 'message' in error) {
        errorMessage = `Error calling remote tool (${(error as any).method}): ${(error as any).message} (Code: ${(error as any).code})`;
     }
    return {
      content: [{ type: "text", text: `<error>${errorMessage}</error>` }],
      isError: true,
    };
  }
}

// --- Tool Definition ---
const codebaseChatTool: Tool = {
  name: "codebase_chat",
  description: "Answers a question about a codebase after packing it using repopack and sending it to an OpenRouter LLM.",
  inputSchema: zodToJsonSchema(CodebaseChatInputSchema, "CodebaseChatInputSchema") as Tool['inputSchema'],
};

// --- Server Setup ---
const server = new McpServer(
  {
    name: REPOROUTER_SERVER_NAME,
    version: REPOROUTER_SERVER_VERSION,
  }
);

// Register the main tool
server.tool(
  codebaseChatTool.name,
  codebaseChatTool.description || "Tool description not available", // Fallback for description
  CodebaseChatInputSchema.shape,
  handleCodebaseChat
);

// --- Start Server and Connect Clients ---

// Function to filter undefined values from process.env
function getFilteredEnv(): Record<string, string> {
  const filteredEnv: Record<string, string> = {};
  for (const key in process.env) {
    const value = process.env[key];
    if (value !== undefined) {
      filteredEnv[key] = value;
    }
  }
  return filteredEnv;
}

async function run() {
  // Define the npm command based on platform
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  // Connect clients first
  try {
    const openRouterServerDir = path.dirname(openRouterServerPath);
    const openRouterPackageDir = path.resolve(openRouterServerDir, '..'); // Go up one level for package root
    logError(`Ensuring OpenRouter server dependencies and build in ${openRouterPackageDir}...`);
    try {
      // Run npm install first using shell:true
      logError(`Running command: ${npmCmd} install in ${openRouterPackageDir}`);
      const installResult = spawnSync(npmCmd, ['install'], { cwd: openRouterPackageDir, stdio: 'inherit', env: getFilteredEnv(), shell: true });
      if (installResult.status !== 0) {
        const errorMsg = installResult.error?.message || `Install failed with status ${installResult.status}`;
        logError(`Error installing OpenRouter dependencies: ${errorMsg}`);
        if (installResult.error && (installResult.error as any).code === 'ENOENT') {
          logError(`Failed to find command: ${npmCmd}. Ensure Node.js/npm is installed and in PATH.`);
        }
        process.exit(1);
      }
      logError('OpenRouter dependencies installed.');

      // Then run npm run build using shell:true
      logError(`Running command: ${npmCmd} run build in ${openRouterPackageDir}`);
      const buildResult = spawnSync(npmCmd, ['run', 'build'], { cwd: openRouterPackageDir, stdio: 'inherit', env: getFilteredEnv(), shell: true });
      if (buildResult.status !== 0) {
          const errorMsg = buildResult.error?.message || `Build failed with status ${buildResult.status}`;
          logError(`Error building OpenRouter server: ${errorMsg}`);
          if (buildResult.error && (buildResult.error as any).code === 'ENOENT') {
            logError(`Failed to find command: ${npmCmd}. Ensure Node.js/npm is installed and in PATH.`);
          }
          process.exit(1);
      }
      logError('OpenRouter server built successfully.');
    } catch (buildError: any) {
       logError(`Error executing setup for OpenRouter server: ${buildError.message}`);
       process.exit(1);
    }

    logError(`Attempting to connect to OpenRouter server via: ${openRouterServerPath}`);
    // Use StdioClientTransport correctly: provide command, args, cwd (dist dir), and filtered env
    const openRouterTransport = new StdioClientTransport({
      command: 'node',
      args: [openRouterServerPath],
      cwd: openRouterServerDir, // CWD for the *running* server is the dist dir
      env: getFilteredEnv(),
      // stderr: 'pipe' // Optionally pipe stderr if needed for debugging child errors
    });
    // Add extra logging before connect
    logError(`DEBUG: Path before connecting to OpenRouter: ${openRouterServerPath}`);
    if (typeof openRouterServerPath !== 'string') {
      logError(`FATAL: openRouterServerPath is not a string before connect!`);
      process.exit(1);
    }
    await openRouterClient.connect(openRouterTransport);
    logError("Connected to OpenRouter server.");
  } catch (error: unknown) { // Use unknown
     const errorMsg = error instanceof Error ? error.message : String(error);
     logError(`Failed to connect to OpenRouter server: ${errorMsg}`);
     process.exit(1); // Exit if essential connection fails
  }

  try {
    const repopackServerDir = path.dirname(repopackServerPath);
    const repopackPackageDir = path.resolve(repopackServerDir, '..'); // Go up one level for package root
    logError(`Ensuring Repopack server dependencies and build in ${repopackPackageDir}...`);
     try {
        // Run npm install first using shell:true
        logError(`Running command: ${npmCmd} install in ${repopackPackageDir}`);
        const installResult = spawnSync(npmCmd, ['install'], { cwd: repopackPackageDir, stdio: 'inherit', env: getFilteredEnv(), shell: true });
        if (installResult.status !== 0) {
            const errorMsg = installResult.error?.message || `Install failed with status ${installResult.status}`;
            logError(`Error installing Repopack dependencies: ${errorMsg}`);
            if (installResult.error && (installResult.error as any).code === 'ENOENT') {
                logError(`Failed to find command: ${npmCmd}. Ensure Node.js/npm is installed and in PATH.`);
            }
            process.exit(1);
        }
        logError('Repopack dependencies installed.');

        // Then run npm run build using shell:true
        logError(`Running command: ${npmCmd} run build in ${repopackPackageDir}`);
        const buildResult = spawnSync(npmCmd, ['run', 'build'], { cwd: repopackPackageDir, stdio: 'inherit', env: getFilteredEnv(), shell: true });
        if (buildResult.status !== 0) {
            const errorMsg = buildResult.error?.message || `Build failed with status ${buildResult.status}`;
            logError(`Error building Repopack server: ${errorMsg}`);
             if (buildResult.error && (buildResult.error as any).code === 'ENOENT') {
                logError(`Failed to find command: ${npmCmd}. Ensure Node.js/npm is installed and in PATH.`);
            }
            process.exit(1);
        }
        logError('Repopack server built successfully.');
     } catch (buildError: any) {
        logError(`Error executing setup for Repopack server: ${buildError.message}`);
        process.exit(1);
     }

    logError(`Attempting to connect to Repopack server via: ${repopackServerPath}`);
    // Use StdioClientTransport correctly: provide command, args, cwd (dist dir), and filtered env
    const repopackTransport = new StdioClientTransport({
        command: 'node',
        args: [repopackServerPath],
        cwd: repopackServerDir, // CWD for the *running* server is the dist dir
        env: getFilteredEnv(),
        // stderr: 'pipe' // Optionally pipe stderr
    });
    await repopackClient.connect(repopackTransport);
    logError("Connected to Repopack server.");
  } catch (error: unknown) { // Use unknown
      const errorMsg = error instanceof Error ? error.message : String(error);
      logError(`Failed to connect to Repopack server: ${errorMsg}`);
      process.exit(1); // Exit if essential connection fails
  }

  // Start the RepoRouter server itself
  const serverTransport = new StdioServerTransport();
  await server.connect(serverTransport);
  logError(`${REPOROUTER_SERVER_NAME} MCP Server running on stdio`);
}

run().catch((error: any) => {
  logError("Fatal error running server:", error);
  process.exit(1);
});
