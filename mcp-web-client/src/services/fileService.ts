import { getCurrentWorkspace } from './workspaceService';
import { callMcpFunction } from './mcpService';

// Interface for file metadata
export interface FileMetadata {
  name: string;
  path: string;
  size: number;
  modifiedAt: Date;
  isDirectory: boolean;
}

// Interface for file content with metadata
export interface FileContent {
  content: string;
  metadata: FileMetadata;
}

/**
 * Get file contents from the current workspace
 * @param filePath The path to the file, relative to the workspace root
 * @returns A promise that resolves to the file content and metadata
 */
export const getFileContent = async (filePath: string): Promise<FileContent> => {
  try {
    // Get the current workspace
    const workspace = getCurrentWorkspace();
    if (!workspace) {
      throw new Error('No active workspace. Please select or create a workspace first.');
    }
    
    // Construct full path
    const fullPath = constructFullPath(workspace.rootPath, filePath);
    
    // Get file content and metadata using MCP
    const result = await callMcpFunction('filesystem', 'readFile', {
      path: fullPath
    });
    
    // Process and return the result
    return {
      content: result.content,
      metadata: {
        name: extractFileName(filePath),
        path: filePath,
        size: result.size || 0,
        modifiedAt: new Date(result.modifiedAt || Date.now()),
        isDirectory: false
      }
    };
  } catch (error) {
    console.error('Error reading file:', error);
    throw new Error(
      error instanceof Error
        ? `Failed to read file: ${error.message}`
        : 'Failed to read file due to an unknown error'
    );
  }
};

/**
 * List files in a directory
 * @param directoryPath The path to the directory, relative to the workspace root
 * @returns A promise that resolves to an array of file metadata
 */
export const listFilesInDirectory = async (directoryPath: string): Promise<FileMetadata[]> => {
  try {
    // Get the current workspace
    const workspace = getCurrentWorkspace();
    if (!workspace) {
      throw new Error('No active workspace. Please select or create a workspace first.');
    }
    
    // Construct full path
    const fullPath = constructFullPath(workspace.rootPath, directoryPath);
    
    // Get directory listing using MCP
    const result = await callMcpFunction('filesystem', 'listFiles', {
      path: fullPath
    });
    
    // Process and return the results
    return (result.files || []).map((file: any) => ({
      name: file.name,
      path: `${directoryPath}/${file.name}`.replace(/\/+/g, '/'), // Normalize path
      size: file.size || 0,
      modifiedAt: new Date(file.modifiedAt || Date.now()),
      isDirectory: file.isDirectory || false
    }));
  } catch (error) {
    console.error('Error listing files:', error);
    throw new Error(
      error instanceof Error
        ? `Failed to list files: ${error.message}`
        : 'Failed to list files due to an unknown error'
    );
  }
};

/**
 * Helper function to construct a full file path
 * @param rootPath The root path of the workspace
 * @param relativePath The relative path to the file
 * @returns The full path to the file
 */
const constructFullPath = (rootPath: string, relativePath: string): string => {
  if (relativePath.startsWith('/')) {
    return relativePath;
  }
  
  // Combine and normalize the path
  return `${rootPath}/${relativePath}`.replace(/\/+/g, '/');
};

/**
 * Extract the file name from a path
 * @param path The file path
 * @returns The file name
 */
const extractFileName = (path: string): string => {
  return path.split('/').pop() || path;
};
