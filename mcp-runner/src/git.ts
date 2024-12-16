import * as path from 'path';
import * as fs from 'fs/promises';
import { execSync } from 'child_process';
import { exists } from './utils';

export async function cloneOrPullRepo(repoUrl: string, branch: string, repoDir: string) {
  try {
    // Use MCP_SERVER_DIR if specified, otherwise use current directory
    const baseDir = process.env.MCP_SERVER_DIR ? 
      path.resolve(process.env.MCP_SERVER_DIR) : 
      path.resolve('.');
    
    const fullTargetDir = path.resolve(baseDir, repoDir);

    const gitDir = path.join(fullTargetDir, '.git');
    const isRepo = await exists(gitDir);

    // Ensure base directory exists
    await fs.mkdir(baseDir, { recursive: true });

    if (isRepo) {
      // If repo exists, reset any changes and force pull latest changes
      console.log(`Repository exists at ${fullTargetDir}, resetting and pulling latest changes...`);
      execSync(`cd "${fullTargetDir}" && git reset --hard HEAD && git clean -fd && git pull origin ${branch}`, { stdio: 'inherit' });
    } else {
      // Create target directory if it doesn't exist
      await fs.mkdir(path.dirname(fullTargetDir), { recursive: true });

      // Clone repository
      console.log(`Cloning repository to ${fullTargetDir}...`);
      execSync(`git clone -b ${branch} ${repoUrl} "${fullTargetDir}"`, { stdio: 'inherit' });
    }

    return fullTargetDir;
  } catch (error) {
    console.error('Error during git operations:', error);
    throw error;
  }
}
