import path from 'path';
import fs from 'fs/promises';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { normalizePath, expandHome, validateDirectory } from '../utils/security.js';

// List allowed directories
export async function listAllowedDirectories() {
  return {
    // @ts-ignore (global is defined in index.ts)
    content: [{ type: "text", text: global.allowedDirectories.join('\n') }]
  };
}

// Input schema for add_allowed_directory
const AddAllowedDirectoryInputSchema = z.object({
  path: z.string().describe("The directory path to add to allowed directories")
});

// Add a new allowed directory
export async function addAllowedDirectory(args: any) {
  const params = AddAllowedDirectoryInputSchema.parse(args);
  const dirPath = normalizePath(path.resolve(expandHome(params.path)));
  
  try {
    // Validate that the directory exists
    const isValid = await validateDirectory(dirPath);
    if (!isValid) {
      return {
        content: [{ type: "text", text: `Error: "${dirPath}" is not a valid directory.` }],
        isError: true
      };
    }
    
    // @ts-ignore (global is defined in index.ts)
    if (global.allowedDirectories.includes(dirPath)) {
      return {
        content: [{ type: "text", text: `Directory "${dirPath}" is already in the allowed list.` }]
      };
    }
    
    // @ts-ignore (global is defined in index.ts)
    global.allowedDirectories.push(dirPath);
    
    return {
      content: [{ type: "text", text: `Successfully added "${dirPath}" to allowed directories.` }]
    };
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true
    };
  }
}

// Input schema for remove_allowed_directory
const RemoveAllowedDirectoryInputSchema = z.object({
  path: z.string().describe("The directory path to remove from allowed directories")
});

// Remove an allowed directory
export async function removeAllowedDirectory(args: any) {
  const params = RemoveAllowedDirectoryInputSchema.parse(args);
  const dirPath = normalizePath(path.resolve(expandHome(params.path)));
  
  // @ts-ignore (global is defined in index.ts)
  const index = global.allowedDirectories.indexOf(dirPath);
  
  if (index === -1) {
    return {
      content: [{ type: "text", text: `Directory "${dirPath}" is not in the allowed list.` }]
    };
  }
  
  // @ts-ignore (global is defined in index.ts)
  global.allowedDirectories.splice(index, 1);
  
  // If we removed the current working directory, reset to the first allowed directory
  // @ts-ignore (global is defined in index.ts)
  if (global.cwd === dirPath && global.allowedDirectories.length > 0) {
    // @ts-ignore (global is defined in index.ts)
    global.cwd = global.allowedDirectories[0];
  }
  
  return {
    content: [{ 
      type: "text", 
      text: `Successfully removed "${dirPath}" from allowed directories.` +
      // @ts-ignore (global is defined in index.ts)
      (global.cwd === dirPath ? ` Current working directory reset to "${global.allowedDirectories[0]}".` : '')
    }]
  };
}

// Tool definitions
export const listAllowedDirectoriesTool: Tool = {
  name: "list_allowed_directories",
  description: "Returns the list of directories that this server is allowed to access",
  parameters: {},
};

export const addAllowedDirectoryTool: Tool = {
  name: "add_allowed_directory",
  description: "Add a new directory to the list of allowed directories",
  parameters: zodToJsonSchema(AddAllowedDirectoryInputSchema),
};

export const removeAllowedDirectoryTool: Tool = {
  name: "remove_allowed_directory",
  description: "Remove a directory from the list of allowed directories",
  parameters: zodToJsonSchema(RemoveAllowedDirectoryInputSchema),
};