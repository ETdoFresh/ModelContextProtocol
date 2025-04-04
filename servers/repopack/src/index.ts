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
import clipboard from 'clipboardy';

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

// --- Restore original Tool Handler ---
async function handlePackCodebase(args: z.infer<typeof PackCodebaseInputSchema>): Promise<CallToolResult> {
  console.error("Received pack_codebase request with args:", args); // Log to stderr

  try {
    // Input is already parsed and validated by McpServer.tool based on the Zod schema
    const validatedArgs = args;
    console.error("Validated args:", validatedArgs);

    // Construct options for fileUtils, ensuring directory is absolute
    const packOptions: PackCodebaseOptions & { outputTarget: 'stdout' | 'file' | 'clipboard' } = {
      directory: path.resolve(validatedArgs.directory), // Ensure absolute path
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
    const { filePaths, ignorePatterns: effectiveIgnorePatterns } = await findFiles(packOptions);
    console.error(`Found ${filePaths.length} files. Effective ignore patterns:`, effectiveIgnorePatterns);
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
        ignorePatterns: effectiveIgnorePatterns
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
            const outputFilename = `repopack-output.${packOptions.outputFormat}`;
            const outputPath = path.join(packOptions.directory, outputFilename);
            try {
                console.error(`Writing output to file: ${outputPath}`);
                fs.writeFileSync(outputPath, outputContent, 'utf8');
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