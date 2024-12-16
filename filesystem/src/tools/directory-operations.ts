import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { validatePath } from "../utils/security.js";

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Schema definitions
export const CreateDirectoryArgsSchema = z.object({
  path: z.string(),
});

export const ListDirectoryArgsSchema = z.object({
  path: z.string(),
});

export const DirectoryTreeArgsSchema = z.object({
  path: z.string(),
});

// Tool definitions
export const directoryOperationTools = [
  {
    name: "create_directory",
    description:
      "Create a new directory or ensure a directory exists. Can create multiple " +
      "nested directories in one operation. If the directory already exists, " +
      "this operation will succeed silently. Perfect for setting up directory " +
      "structures for projects or ensuring required paths exist. Only works within allowed directories.",
    inputSchema: zodToJsonSchema(CreateDirectoryArgsSchema) as ToolInput,
  },
  {
    name: "list_directory",
    description:
      "Get a detailed listing of all files and directories in a specified path. " +
      "Results clearly distinguish between files and directories with [FILE] and [DIR] " +
      "prefixes. This tool is essential for understanding directory structure and " +
      "finding specific files within a directory. Only works within allowed directories.",
    inputSchema: zodToJsonSchema(ListDirectoryArgsSchema) as ToolInput,
  },
  {
    name: "directory_tree",
    description:
      "Get a recursive tree view of files and directories as a JSON structure. " +
      "Each entry includes 'name', 'type' (file/directory), and 'children' for directories. " +
      "Files have no children array, while directories always have a children array (which may be empty). " +
      "The output is formatted with 2-space indentation for readability. Only works within allowed directories.",
    inputSchema: zodToJsonSchema(DirectoryTreeArgsSchema) as ToolInput,
  },
];

interface TreeEntry {
  name: string;
  type: 'file' | 'directory';
  children?: TreeEntry[];
}

// Tool handlers
export async function handleCreateDirectory(args: unknown) {
  const parsed = CreateDirectoryArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for create_directory: ${parsed.error}`);
  }
  const validPath = await validatePath(parsed.data.path);
  await fs.mkdir(validPath, { recursive: true });
  return {
    content: [{ type: "text", text: `Successfully created directory ${parsed.data.path}` }],
  };
}

export async function handleListDirectory(args: unknown) {
  const parsed = ListDirectoryArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for list_directory: ${parsed.error}`);
  }
  const validPath = await validatePath(parsed.data.path);
  const entries = await fs.readdir(validPath, { withFileTypes: true });
  const formatted = entries
    .map((entry) => `${entry.isDirectory() ? "[DIR]" : "[FILE]"} ${entry.name}`)
    .join("\n");
  return {
    content: [{ type: "text", text: formatted }],
  };
}

export async function handleDirectoryTree(args: unknown) {
  const parsed = DirectoryTreeArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for directory_tree: ${parsed.error}`);
  }

  async function buildTree(currentPath: string): Promise<TreeEntry[]> {
    const validPath = await validatePath(currentPath);
    const entries = await fs.readdir(validPath, { withFileTypes: true });
    const result: TreeEntry[] = [];

    for (const entry of entries) {
      const entryData: TreeEntry = {
        name: entry.name,
        type: entry.isDirectory() ? 'directory' : 'file'
      };

      if (entry.isDirectory()) {
        const subPath = path.join(currentPath, entry.name);
        entryData.children = await buildTree(subPath);
      }

      result.push(entryData);
    }

    return result;
  }

  const treeData = await buildTree(parsed.data.path);
  return {
    content: [{
      type: "text",
      text: JSON.stringify(treeData, null, 2)
    }],
  };
}
