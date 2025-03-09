import path from 'path';
import fs from 'fs/promises';
import os from 'os';

// Expand tilde in paths (e.g., ~/Documents)
export function expandHome(filepath: string): string {
  if (filepath.startsWith('~')) {
    return path.join(os.homedir(), filepath.slice(1));
  }
  return filepath;
}

// Normalize path to prevent directory traversal attacks
export function normalizePath(filepath: string): string {
  return path.normalize(filepath);
}

// Check if a path is within allowed directories
export function isPathAllowed(checkPath: string): boolean {
  const normalizedPath = normalizePath(path.resolve(checkPath));
  
  // @ts-ignore (global is defined in index.ts)
  return global.allowedDirectories.some((allowedDir: string) => {
    return normalizedPath === allowedDir || normalizedPath.startsWith(allowedDir + path.sep);
  });
}

// Validate if a command is allowed to run
export function isCommandAllowed(command: string): boolean {
  // Block potentially dangerous commands
  const blockedCommands = [
    /rm\s+.*(\/|\\|-r|-f|-rf|-fr)/, // Remove commands with flags or paths
    /mkfs/,         // Format filesystems
    /dd/,           // Low-level data operations
    /chmod\s+.*777/, // Wide open permissions
    /chown/,        // Change ownership
    /shred/,        // Secure delete
    /wget|curl/,    // Network downloads
    /eval/,         // Execute strings as code
    /sudo/,         // Elevated privileges
    /su\s/,         // Switch user
    /passwd/,       // Change passwords
    />(>?)\s*\//,   // Output redirection to root dirs
    /\|\s*(?:sh|bash|zsh|ksh|csh|tcsh|fish|cmd|powershell|pwsh)/i, // Pipe to shell
    /exec/,         // Execute in current process
    /source/,       // Source files
    /env/,          // View/modify environment
  ];

  // Check if the command contains any blocked patterns
  return !blockedCommands.some(pattern => pattern.test(command));
}

// Check if a directory exists and is a directory
export async function validateDirectory(dirPath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
}

// Escape command to prevent injection
export function escapeCommand(command: string): string {
  // Replace any instances of multiple semicolons with a single one
  return command.replace(/;{2,}/g, ';');
}