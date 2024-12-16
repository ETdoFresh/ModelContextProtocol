import fs from "fs/promises";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { ToolSchema } from "@modelcontextprotocol/sdk/types.js";
import { validatePath } from "../utils/security.js";

const ToolInputSchema = ToolSchema.shape.inputSchema;
type ToolInput = z.infer<typeof ToolInputSchema>;

// Schema definitions
export const MoveFileArgsSchema = z.object({
  source: z.string(),
  destination: z.string(),
});

// Tool definitions
export const moveFileTools = [
  {
    name: "move_file",
    description:
      "Move or rename files and directories. Can move files between directories " +
      "and rename them in a single operation. If the destination exists, the " +
      "operation will fail. Works across different directories and can be used " +
      "for simple renaming within the same directory. Both source and destination must be within allowed directories.",
    inputSchema: zodToJsonSchema(MoveFileArgsSchema) as ToolInput,
  },
];

// Tool handlers
export async function handleMoveFile(args: unknown) {
  const parsed = MoveFileArgsSchema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid arguments for move_file: ${parsed.error}`);
  }
  const validSourcePath = await validatePath(parsed.data.source);
  const validDestPath = await validatePath(parsed.data.destination);
  await fs.rename(validSourcePath, validDestPath);
  return {
    content: [{ type: "text", text: `Successfully moved ${parsed.data.source} to ${parsed.data.destination}` }],
  };
}
