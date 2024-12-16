import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { validatePath } from "../utils/security.js";
import { minimatch } from 'minimatch';

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Schema definitions
export const SearchFilesArgsSchema = z.object({
  path: z.string(),
  pattern: z.string(),
  excludePatterns: z.array(z.string()).optional().default([])
});

// Tool definitions
export const searchFileTools = [
  {
    name: "search_files",
    description:
      "Recursively search for files and directories matching a pattern. " +
      "Searches through all subdirectories from the starting path. The search " +
      "is case-insensitive and matches partial names. Returns full paths to all " +
      "matching items. Great for finding files when you don't know their exact location. " +
      "Only searches within allowed directories.",
    inputSchema: zodToJsonSchema(SearchFilesArgsSchema) as ToolInput,
  },
];

// Tool implementations
async function searchFiles(
  rootPath: string,
  pattern: string,
  excludePatterns: string[] = []
): Promise<string[]> {
  const results: string[] = [];

  async function search(currentPath: string) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);

      try {
        // Validate each path before processing
        await validatePath(fullPath);

        // Check if path matches any exclude pattern
        const relativePath = path.relative(rootPath, fullPath);
        const shouldExclude = excludePatterns.some(pattern => {
          const globPattern = pattern.includes('*') ? pattern : `**/${pattern}/**`;
          return minimatch(relativePath, globPattern, { dot: true });
        });

        if (shouldExclude) {
          continue;
        }

        if (entry.name.toLowerCase().includes(pattern.toLowerCase())) {
          results.push(fullPath);
        }

        if (entry.isDirectory()) {
          await search(fullPath);
        }
      } catch (error) {
        // Skip invalid paths during search
        continue;
      }
    }
  }

  await search(rootPath);
  return results;
}

// Tool handlers
export async function handleSearchFiles(args: unknown) {
  const parsed = SearchFilesArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for search_files: ${parsed.error}`);
  }
  const validPath = await validatePath(parsed.data.path);
  const results = await searchFiles(validPath, parsed.data.pattern, parsed.data.excludePatterns);
  return {
    content: [{ type: "text", text: results.length > 0 ? results.join("\n") : "No matches found" }],
  };
}
