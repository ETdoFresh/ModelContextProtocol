import fs from "fs/promises";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { validatePath } from "../utils/security.js";

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Schema definitions
export const ReadFileArgsSchema = z.object({
  path: z.string(),
});

export const ReadMultipleFilesArgsSchema = z.object({
  paths: z.array(z.string()),
});

// Tool definitions
export const readFileTools = [
  {
    name: "read_file",
    description:
      "Read the complete contents of a file from the file system. " +
      "Handles various text encodings and provides detailed error messages " +
      "if the file cannot be read. Use this tool when you need to examine " +
      "the contents of a single file. Only works within allowed directories.",
    inputSchema: zodToJsonSchema(ReadFileArgsSchema) as ToolInput,
  },
  {
    name: "read_multiple_files",
    description:
      "Read the contents of multiple files simultaneously. This is more " +
      "efficient than reading files one by one when you need to analyze " +
      "or compare multiple files. Each file's content is returned with its " +
      "path as a reference. Failed reads for individual files won't stop " +
      "the entire operation. Only works within allowed directories.",
    inputSchema: zodToJsonSchema(ReadMultipleFilesArgsSchema) as ToolInput,
  },
];

// Tool handlers
export async function handleReadFile(args: unknown) {
  const parsed = ReadFileArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for read_file: ${parsed.error}`);
  }
  const validPath = await validatePath(parsed.data.path);
  const content = await fs.readFile(validPath, "utf-8");
  return {
    content: [{ type: "text", text: content }],
  };
}

export async function handleReadMultipleFiles(args: unknown) {
  const parsed = ReadMultipleFilesArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for read_multiple_files: ${parsed.error}`);
  }
  const results = await Promise.all(
    parsed.data.paths.map(async (filePath: string) => {
      try {
        const validPath = await validatePath(filePath);
        const content = await fs.readFile(validPath, "utf-8");
        return `${filePath}:\n${content}\n`;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `${filePath}: Error - ${errorMessage}`;
      }
    }),
  );
  return {
    content: [{ type: "text", text: results.join("\n---\n") }],
  };
}
