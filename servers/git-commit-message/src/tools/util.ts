import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Validates that a path is a valid git repository
 * @param repoPath Path to the repository to validate
 * @returns True if valid, throws an error if invalid
 */
export async function validateRepoPath(repoPath: string): Promise<boolean> {
  try {
    // Resolve the path to handle relative paths
    const resolvedPath = path.resolve(repoPath);
    
    // Check if the path exists and is a directory
    const stats = await fs.stat(resolvedPath);
    if (!stats.isDirectory()) {
      throw new Error(`${resolvedPath} is not a directory.`);
    }
    
    // Check if it's a git repository by running a simple git command
    try {
      await execAsync("git rev-parse --is-inside-work-tree", {
        cwd: resolvedPath,
      });
    } catch (error) {
      throw new Error(`${resolvedPath} is not a Git repository.`);
    }
    
    return true;
  } catch (error: any) {
    throw new Error(`Error accessing repository: ${error.message}`);
  }
}

/**
 * Executes a git command in the specified repository
 * @param command Git command to execute
 * @param repoPath Path to the repository
 * @returns The stdout and stderr from the command
 */
export async function execGitCommand(command: string, repoPath: string): Promise<{stdout: string, stderr: string}> {
  const resolvedPath = path.resolve(repoPath);
  await validateRepoPath(resolvedPath);
  
  return await execAsync(command, {
    cwd: resolvedPath,
    maxBuffer: 10 * 1024 * 1024 // Increase buffer to 10MB
  });
}
