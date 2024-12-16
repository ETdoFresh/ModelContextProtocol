import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { normalizePath, expandHome } from "../utils/security.js";

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Schema definitions
export const AddAllowedDirectoryArgsSchema = z.object({
  path: z.string(),
});

export const RemoveAllowedDirectoryArgsSchema = z.object({
  path: z.string(),
});

// Tool definitions
export const allowedDirectoryTools = [
  {
    name: "list_allowed_directories",
    description:
      "Returns the list of directories that this server is allowed to access. " +
      "Use this to understand which directories are available before trying to access files.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    } as ToolInput,
  },
  {
    name: "add_allowed_directory",
    description:
      "Add a new directory to the list of allowed directories. The directory must exist " +
      "and be accessible. This expands the server's access to include the new directory " +
      "and its subdirectories.",
    inputSchema: zodToJsonSchema(AddAllowedDirectoryArgsSchema) as ToolInput,
  },
  {
    name: "remove_allowed_directory",
    description:
      "Remove a directory from the list of allowed directories. This restricts the server's " +
      "access by removing the specified directory from the allowed list. The directory must " +
      "be an exact match to an existing allowed directory.",
    inputSchema: zodToJsonSchema(RemoveAllowedDirectoryArgsSchema) as ToolInput,
  },
];

// Tool handlers
export async function handleListAllowedDirectories() {
  return {
    content: [{
      type: "text",
      text: `Allowed directories:\n${global.allowedDirectories.join('\n')}`
    }],
  };
}

export async function handleAddAllowedDirectory(args: unknown) {
  const parsed = AddAllowedDirectoryArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for add_allowed_directory: ${parsed.error}`);
  }

  const newDir = normalizePath(path.resolve(expandHome(parsed.data.path)));

  // Verify directory exists and is accessible
  try {
    const stats = await fs.stat(newDir);
    if (!stats.isDirectory()) {
      throw new Error(`${newDir} is not a directory`);
    }
  } catch (error) {
    throw new Error(`Error accessing directory ${newDir}: ${error}`);
  }

  // Check if directory is already allowed
  if (global.allowedDirectories.includes(newDir)) {
    return {
      content: [{ type: "text", text: `Directory ${newDir} is already in the allowed list` }],
    };
  }

  // Add to allowed directories
  global.allowedDirectories.push(newDir);

  return {
    content: [{ type: "text", text: `Successfully added ${newDir} to allowed directories` }],
  };
}

export async function handleRemoveAllowedDirectory(args: unknown) {
  const parsed = RemoveAllowedDirectoryArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for remove_allowed_directory: ${parsed.error}`);
  }

  const dirToRemove = normalizePath(path.resolve(expandHome(parsed.data.path)));

  // Find the directory in the allowed list
  const index = global.allowedDirectories.indexOf(dirToRemove);
  if (index === -1) {
    throw new Error(`Directory ${dirToRemove} is not in the allowed list`);
  }

  // Remove from allowed directories
  global.allowedDirectories.splice(index, 1);

  return {
    content: [{ type: "text", text: `Successfully removed ${dirToRemove} from allowed directories` }],
  };
}
