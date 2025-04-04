#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { findFiles, processFiles, generateDirectoryStructure, PackCodebaseOptions } from './fileUtils.js';
import { generateXmlOutput } from './xmlOutput.js';
import { generateMarkdownOutput } from './markdownOutput.js';
import { generateTextOutput } from './textOutput.js';
import path from 'node:path';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import { execSync } from 'node:child_process';
import clipboard from 'clipboardy';

// Helper function to normalize potential URI paths from clients
function normalizePathUri(uriPath: string): string {
  // Match patterns like /c%3A/..., /C%3A/... or file:///c%3A/...
  const match = uriPath.match(/^(?:file:\/\/\/)?\/([a-zA-Z])%3A\/(.*)$/);
  if (match && process.platform === 'win32') {
    const driveLetter = match[1];
    const restOfPath = match[2];
    try {
        // Decode URI components and replace forward slashes with backslashes for Windows
        const decodedPath = decodeURIComponent(restOfPath);
        const winPath = `${driveLetter}:\\${decodedPath.replace(/\//g, '\\')}`;
        // console.error(`Normalized URI path "${uriPath}" to "${winPath}"`); // Optional logging
        return winPath;
    } catch (e) {
        console.error(`Failed to decode/normalize path URI "${uriPath}":`, e);
         // Fallback to original if decoding fails catastrophically
         return uriPath;
    }
  }

  // Also handle general URI decoding for non-windows or non-matching paths
  try {
      const decoded = decodeURIComponent(uriPath);
      // if (decoded !== uriPath) { // Optional logging
      //     console.error(`Decoded path URI "${uriPath}" to "${decoded}"`);
      // }
      return decoded;
  } catch (e) {
      console.error(`Failed to decode path URI "${uriPath}":`, e);
      // Fallback to original if decoding fails
      return uriPath;
  }
}

// Restore original Zod Schema
const PackCodebaseInputSchema = z.object({
  directory: z.string().describe("*Absolute path to the code directory to pack (Windows: C:\\Directory\\File.txt Mac/Linux: /Directory/File.txt) [Required]"),
  includePatterns: z.string().optional().describe("Comma-separated glob patterns for files to include [Optional]"),
  ignorePatterns: z.string().optional().describe("Comma-separated glob patterns for files/directories to ignore [Optional]"),
  outputFormat: z.enum(['xml', 'md', 'txt']).optional().default('xml').describe("Output format: 'xml', 'md', or 'txt' [Optional]"),
  outputTarget: z.enum(['stdout', 'file', 'clipboard']).optional().default('stdout').describe("Output destination: 'stdout', 'file' (repopack.{format} in input dir), or 'clipboard' [Optional]"),
  removeComments: z.boolean().optional().default(false).describe("Remove comments from code files [Optional]"),
  removeEmptyLines: z.boolean().optional().default(false).describe("Remove empty lines from files [Optional]"),
  fileSummary: z.boolean().optional().default(true).describe("Include a summary section in the output [Optional]"),
  directoryStructure: z.boolean().optional().default(true).describe("Include a directory structure section in the output [Optional]"),
  noGitignore: z.boolean().optional().default(false).describe("Disable the use of .gitignore files [Optional]"),
  noDefaultPatterns: z.boolean().optional().default(false).describe("Disable default ignore patterns [Optional]"),
});

// New Zod Schema for remote codebase packing
const PackRemoteCodebaseInputSchema = PackCodebaseInputSchema.extend({
  github_repo: z.string().describe("*URL of the GitHub repository to clone (e.g., https://github.com/user/repo.git) [Required]"),
});

// --- Restore original Tool Handler ---
async function handlePackCodebase(
    args: z.infer<typeof PackCodebaseInputSchema> & { originalDirectory?: string; sourceIdentifier?: string; repoOwner?: string; repoName?: string }
): Promise<CallToolResult> {
  console.error("Received pack_codebase request with args:", args); // Log to stderr

  try {
    // Input is already parsed and validated by McpServer.tool based on the Zod schema
    const validatedArgs = args;
    console.error("Validated args:", validatedArgs);

    // Normalize the directory path *before* resolving
    const normalizedDirectory = normalizePathUri(validatedArgs.directory);
    const resolvedNormalizedDirectory = path.resolve(normalizedDirectory); // Resolve the *normalized* path

    // Construct options for fileUtils, using the resolved normalized path
    const packOptions: PackCodebaseOptions & { outputTarget: 'stdout' | 'file' | 'clipboard' } = {
      directory: resolvedNormalizedDirectory, // Use the fully resolved normalized path
      sourceIdentifier: validatedArgs.sourceIdentifier || resolvedNormalizedDirectory, // Use resolved normalized path here too
      includePatterns: validatedArgs.includePatterns,
      ignorePatterns: validatedArgs.ignorePatterns,
      removeComments: validatedArgs.removeComments,
      removeEmptyLines: validatedArgs.removeEmptyLines,
      useGitignore: !validatedArgs.noGitignore,
      useDefaultPatterns: !validatedArgs.noDefaultPatterns,
      // Pass XML generation options through
      fileSummary: validatedArgs.fileSummary,
      directoryStructure: validatedArgs.directoryStructure,
      // Pass output format
      outputFormat: validatedArgs.outputFormat,
      // Pass outputTarget flag
      outputTarget: validatedArgs.outputTarget,
    };
    console.error("Effective pack options:", packOptions);

    // 1. Find files
    console.error("Finding files...");
    const { filePaths, defaultIgnorePatterns, inputIgnorePatterns, gitignorePatterns } = await findFiles(packOptions);
    console.error(`Found ${filePaths.length} files.`);
    console.error(`Default ignore patterns: ${defaultIgnorePatterns.length}`);
    console.error(`Input ignore patterns: ${inputIgnorePatterns.length}`);
    console.error(`Gitignore patterns: ${gitignorePatterns.length}`);
     if (filePaths.length === 0) {
        return {
            content: [{ type: "text", text: "<error>No files found matching the criteria.</error>" }],
            isError: true
        };
    }

    // 2. Process files (read content, optionally modify)
    console.error("Processing files...");
    const processedFiles = await processFiles(filePaths, packOptions);
    console.error(`Processed ${processedFiles.length} files.`);

    // 3. Generate directory structure string
    let dirStructureString = "";
    if (packOptions.directoryStructure) {
        console.error("Generating directory structure...");
        dirStructureString = generateDirectoryStructure(filePaths); // Use original paths for structure
        console.error("Directory structure generated.");
    }

    // 4. Generate Output (Conditional)
    console.error(`Generating output in ${packOptions.outputFormat} format...`);
    let outputContent = "";
    const generatorContext = {
        directoryStructure: dirStructureString,
        processedFiles,
        options: packOptions,
        // Pass categorized patterns
        defaultIgnorePatterns,
        inputIgnorePatterns,
        gitignorePatterns
    };

    switch (packOptions.outputFormat) {
        case 'md':
            outputContent = generateMarkdownOutput(generatorContext);
            break;
        case 'txt':
            outputContent = generateTextOutput(generatorContext);
            break;
        case 'xml':
        default:
            outputContent = generateXmlOutput(generatorContext);
            break;
    }
    console.error("Output generated.");

    // 5. Handle Output based on outputTarget
    switch (packOptions.outputTarget) {
        case 'file':
            // Construct filename: use owner/repo if provided (from remote), else default
            const filenameBase = (args.repoOwner && args.repoName)
                ? `repopack-output-${args.repoOwner}-${args.repoName}`
                : `repopack-output`;
            const outputFilename = `${filenameBase}.${packOptions.outputFormat}`;

            // Determine the base directory for the output file:
            // Normalize the 'originalDirectory' if provided (from remote clone),
            // otherwise, normalize the input 'directory' argument.
            const outputBaseDirRaw = args.originalDirectory || validatedArgs.directory;
            const outputBaseDirNormalized = normalizePathUri(outputBaseDirRaw);
            const outputPath = path.join(outputBaseDirNormalized, outputFilename);

            try {
                console.error(`Writing output to file: ${outputPath}`);
                // Ensure the directory exists before writing
                await fsp.mkdir(path.dirname(outputPath), { recursive: true });
                await fsp.writeFile(outputPath, outputContent, 'utf8');
                console.error(`Successfully wrote to ${outputPath}`);
                return {
                    content: [{ type: "text", text: `Repopack written to ${outputPath}` }],
                };
            } catch (writeError: any) {
                console.error(`Error writing output file: ${writeError.message}`, writeError.stack);
                return {
                    content: [{ type: "text", text: `<error>Error writing output file ${outputPath}: ${writeError.message}</error>` }],
                    isError: true,
                };
            }
            break;

        case 'clipboard':
            try {
                console.error(`Copying output to clipboard...`);
                clipboard.writeSync(outputContent);
                console.error(`Successfully copied output to clipboard.`);
                return {
                    content: [{ type: "text", text: `Repopack content copied to clipboard.` }],
                };
            } catch (clipboardError: any) {
                console.error(`Error copying to clipboard: ${clipboardError.message}`, clipboardError.stack);
                return {
                    content: [{ type: "text", text: `<error>Error copying output to clipboard: ${clipboardError.message}</error>` }],
                    isError: true,
                };
            }
            break;

        case 'stdout':
        default:
            // Original behavior: return content via stdio
            return {
              content: [{ type: "text", text: outputContent }], // Use the generated output
            };
    }

  } catch (error: any) {
    console.error(`Error in pack_codebase: ${error.message}`, error.stack); // Log full error to stderr
    let errorMessage = `Error processing pack_codebase: ${error.message}`;
    if (error instanceof z.ZodError) {
        // This case might be less likely now as validation happens before the handler
        errorMessage = `Invalid input: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`;
    }
    return {
      content: [{ type: "text", text: `<error>${errorMessage}</error>` }],
      isError: true,
    };
  }
}

// --- New Tool Handler for Remote Codebase ---
async function handlePackRemoteCodebase(args: z.infer<typeof PackRemoteCodebaseInputSchema>): Promise<CallToolResult> {
  console.error("Received pack_remote_codebase request with args:", args); // Log to stderr
  let tempDir: string | undefined;
  // Normalize the original directory arg *before* using it or passing it down
  const originalDirectoryNormalized = normalizePathUri(args.directory);

  try {
    // 1. Create a temporary directory
    tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'repopack-clone-'));
    console.error(`Created temporary directory: ${tempDir}`);

    // 2. Clone the repository
    const cloneUrl = args.github_repo;
    console.error(`Cloning repository: ${cloneUrl} into ${tempDir}`);
    try {
      // Use execSync for simplicity here, consider async execution for large repos
      execSync(`git clone --depth 1 ${cloneUrl} .`, { cwd: tempDir, stdio: 'pipe' }); // Clone into the temp dir itself
      console.error(`Successfully cloned ${cloneUrl}`);
    } catch (cloneError: any) {
      console.error(`Error cloning repository: ${cloneError.message}`, cloneError.stderr?.toString());
      return {
        content: [{ type: "text", text: `<error>Error cloning repository ${cloneUrl}: ${cloneError.message}</error>` }],
        isError: true,
      };
    }

    // Extract owner/repo from URL for filename generation
    let repoOwner: string | undefined;
    let repoName: string | undefined;
    const repoUrlMatch = args.github_repo.match(/(?:https:\/\/github\.com\/|git@github\.com:)([^\/]+)\/([^\/]+?)(\.git)?$/i);
    if (repoUrlMatch && repoUrlMatch.length >= 3) {
        repoOwner = repoUrlMatch[1];
        repoName = repoUrlMatch[2];
        console.error(`Extracted repo owner: ${repoOwner}, name: ${repoName}`);
    }

    // 3. Prepare arguments for handlePackCodebase
    // We need to pass all original args EXCEPT github_repo, and set the directory
    // Also pass the original directory arg so 'file' output target works correctly
    // Pass the github_repo as the sourceIdentifier
    // Pass extracted owner/name for filename
    const packCodebaseArgs: z.infer<typeof PackCodebaseInputSchema> & { originalDirectory?: string; sourceIdentifier?: string; repoOwner?: string; repoName?: string } = {
      ...args, // Spread all args
      directory: tempDir, // Override directory with temp path
      originalDirectory: originalDirectoryNormalized, // Pass *normalized* original directory
      sourceIdentifier: args.github_repo, // Pass repo URL as the source identifier
      repoOwner: repoOwner, // Pass owner for filename
      repoName: repoName, // Pass repo name for filename
    };
    // delete (packCodebaseArgs as any).github_repo; // Clean way to remove, though handlePackCodebase ignores it

    console.error(`Calling handlePackCodebase for temp directory: ${tempDir} with normalized original directory: ${originalDirectoryNormalized}, sourceIdentifier: ${args.github_repo}, owner: ${repoOwner}, name: ${repoName}`);
    // 4. Call the original pack_codebase handler
    const result = await handlePackCodebase(packCodebaseArgs);
    console.error(`handlePackCodebase completed for ${tempDir}`);
    return result;

  } catch (error: any) {
    console.error(`Error in handlePackRemoteCodebase: ${error.message}`, error.stack);
    return {
      content: [{ type: "text", text: `<error>Error processing pack_remote_codebase: ${error.message}</error>` }],
      isError: true,
    };
  } finally {
    // 5. Clean up the temporary directory
    if (tempDir) {
      console.error(`Cleaning up temporary directory: ${tempDir}`);
      try {
        await fsp.rm(tempDir, { recursive: true, force: true });
        console.error(`Successfully removed temporary directory: ${tempDir}`);
      } catch (cleanupError: any) {
        console.error(`Error removing temporary directory ${tempDir}: ${cleanupError.message}`);
        // Log cleanup error but don't necessarily overwrite the primary result/error
      }
    }
  }
}

// --- Server Setup ---
const server = new McpServer(
  {
    name: "repopack-server",
    version: "1.0.0", // Consider getting version dynamically like the example
  }
  // No capabilities needed here, McpServer handles tool capabilities implicitly
);

// Register the tool using the server.tool() method
server.tool(
  "pack_codebase",
  "Package a local code directory into a consolidated text file [xml-default, md, txt] for AI analysis. Output can be directed to 'stdout' (default), a 'file' (repopack-output.{format}), or the 'clipboard'. Even though stdout is the default, it is recommended to use the 'file' as most codebases are large and stdout may be too large to handle.",
  // Use the original schema shape
  PackCodebaseInputSchema.shape,
  handlePackCodebase // Pass the handler function
);

// Register the new remote tool
server.tool(
  "pack_remote_codebase",
  "Clones a remote GitHub repository to a temporary location and then packages it using the same logic as pack_codebase. Output can be directed to 'stdout', 'file', or 'clipboard'.",
  PackRemoteCodebaseInputSchema.shape, // Use the new schema
  handlePackRemoteCodebase          // Use the new handler
);

// --- Start Server ---
async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log startup message to stderr to avoid interfering with JSON-RPC on stdout
  console.error("Repopack MCP Server running on stdio");
}

runServer().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
}); 