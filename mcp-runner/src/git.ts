import * as path from 'path';
import * as fs from 'fs/promises';
import { execSync } from 'child_process';
import { exists } from './utils';

export async function cloneOrPullRepo(repoUrl: string, branch: string, targetDir: string) {
  try {
    // Use MCP_SERVER_DIR if specified, otherwise create mcp-servers in runtime directory
    const scriptDir = path.dirname(process.argv[1]); // Get the directory of the running script
    const baseDir = process.env.MCP_SERVER_DIR || path.join(scriptDir, 'mcp-servers');
    const fullTargetDir = path.join(baseDir, targetDir);

    const gitDir = path.join(fullTargetDir, '.git');
    const isRepo = await exists(gitDir);

    // Ensure base directory exists
    await fs.mkdir(baseDir, { recursive: true });

    if (isRepo) {
      // If repo exists, just pull latest changes
      console.log(`Repository exists at ${fullTargetDir}, pulling latest changes...`);
      execSync(`cd "${fullTargetDir}" && git pull origin ${branch}`, { stdio: 'inherit' });
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
