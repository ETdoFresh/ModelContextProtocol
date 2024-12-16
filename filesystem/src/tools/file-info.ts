import fs from "fs/promises";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { validatePath } from "../utils/security.js";

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Schema definitions
export const GetFileInfoArgsSchema = z.object({
  path: z.string(),
});

// Tool definitions
export const fileInfoTools = [
  {
    name: "get_file_info",
    description:
      "Retrieve detailed metadata about a file or directory. Returns comprehensive " +
      "information including size, creation time, last modified time, permissions, " +
      "and type. This tool is perfect for understanding file characteristics " +
      "without reading the actual content. Only works within allowed directories.",
    inputSchema: zodToJsonSchema(GetFileInfoArgsSchema) as ToolInput,
  },
];

interface FileInfo {
  size: number;
  created: Date;
  modified: Date;
  accessed: Date;
  isDirectory: boolean;
  isFile: boolean;
  permissions: string;
}

// Tool implementations
async function getFileStats(filePath: string): Promise<FileInfo> {
  const stats = await fs.stat(filePath);
  return {
    size: stats.size,
    created: stats.birthtime,
    modified: stats.mtime,
    accessed: stats.atime,
    isDirectory: stats.isDirectory(),
    isFile: stats.isFile(),
    permissions: stats.mode.toString(8).slice(-3),
  };
}

// Tool handlers
export async function handleGetFileInfo(args: unknown) {
  const parsed = GetFileInfoArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for get_file_info: ${parsed.error}`);
  }
  const validPath = await validatePath(parsed.data.path);
  const info = await getFileStats(validPath);
  return {
    content: [{ type: "text", text: Object.entries(info)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n") }],
  };
}
