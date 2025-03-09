import { existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

/**
 * Workspace state singleton for tracking current working directory
 */
class WorkspaceState {
  private static instance: WorkspaceState;
  private currentWorkingDirectory: string;

  private constructor() {
    // Initialize with user's home directory
    this.currentWorkingDirectory = homedir();
  }

  public static getInstance(): WorkspaceState {
    if (!WorkspaceState.instance) {
      WorkspaceState.instance = new WorkspaceState();
    }
    return WorkspaceState.instance;
  }

  /**
   * Get the current working directory
   */
  public getCwd(): string {
    return this.currentWorkingDirectory;
  }

  /**
   * Set the current working directory
   * @param newPath The new path to set as CWD
   * @returns Success status and message
   */
  public setCwd(newPath: string): { success: boolean; message: string } {
    // Handle relative paths
    const resolvedPath = this.resolvePath(newPath);
    
    // Verify the path exists
    if (!existsSync(resolvedPath)) {
      return { 
        success: false, 
        message: `Directory does not exist: ${resolvedPath}` 
      };
    }
    
    // Update the CWD
    this.currentWorkingDirectory = resolvedPath;
    return { 
      success: true, 
      message: `Changed directory to: ${resolvedPath}` 
    };
  }

  /**
   * Resolve a path against the current working directory
   * @param inputPath The path to resolve
   * @returns The resolved absolute path
   */
  public resolvePath(inputPath: string): string {
    if (path.isAbsolute(inputPath)) {
      return path.normalize(inputPath);
    }
    return path.resolve(this.currentWorkingDirectory, inputPath);
  }
}

export default WorkspaceState;
