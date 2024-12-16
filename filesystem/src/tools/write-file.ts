import fs from "fs/promises";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { validatePath } from "../utils/security.js";

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Schema definitions
export const WriteFileArgsSchema = z.object({
  path: z.string(),
  content: z.string(),
});

// Tool definitions
export const writeFileTools = [
  {
    name: "write_file",
    description:
      "Create a new file or completely overwrite an existing file with new content. " +
      "Use with caution as it will overwrite existing files without warning. " +
      "Handles text content with proper encoding. Only works within allowed directories.",
    inputSchema: zodToJsonSchema(WriteFileArgsSchema) as ToolInput,
  },
];

// Tool handlers
export async function handleWriteFile(args: unknown) {
  const parsed = WriteFileArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for write_file: ${parsed.error}`);
  }
  const validPath = await validatePath(parsed.data.path);
  await fs.writeFile(validPath, parsed.data.content, "utf-8");
  return {
    content: [{ type: "text", text: `Successfully wrote to ${parsed.data.path}` }],
  };
}
