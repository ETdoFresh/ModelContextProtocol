import fs from "fs/promises";
import path from "path";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { validatePath } from "../utils/security.js";

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Schema definitions
export const ChangeCwdArgsSchema = z.object({
  path: z.string(),
});

// Tool definitions
export const cwdOperationTools = [
  {
    name: "get_cwd",
    description:
      "Get the current working directory. This is the directory that relative paths " +
      "will be resolved against. By default, it is set to the first allowed directory.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    } as ToolInput,
  },
  {
    name: "change_cwd",
    description:
      "Change the current working directory. The new directory must exist and be " +
      "within one of the allowed directories. This affects how relative paths are resolved.",
    inputSchema: zodToJsonSchema(ChangeCwdArgsSchema) as ToolInput,
  },
];

// Tool handlers
export async function handleGetCwd() {
  return {
    content: [{ type: "text", text: `Current working directory: ${global.cwd}` }],
  };
}

export async function handleChangeCwd(args: unknown) {
  const parsed = ChangeCwdArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for change_cwd: ${parsed.error}`);
  }
  
  const requestedPath = parsed.data.path;
  
  // Validate and resolve the path
  const validPath = await validatePath(requestedPath);
  
  // Check if it's a directory
  try {
    const stats = await fs.stat(validPath);
    if (!stats.isDirectory()) {
      throw new Error(`${validPath} is not a directory`);
    }
  } catch (error) {
    throw new Error(`Error accessing directory ${validPath}: ${error}`);
  }
  
  // Set the new CWD
  global.cwd = validPath;
  
  return {
    content: [{ type: "text", text: `Changed working directory to: ${validPath}` }],
  };
}