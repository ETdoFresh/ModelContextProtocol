import * as path from 'path';
import { execSync } from 'child_process';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import { ProjectInfo } from './types';
import { exists, isEsModule } from './utils';
import { cloneOrPullRepo } from './git';

export async function findEntryPoint(projectPath: string): Promise<string> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    
    // Check dist directory first
    const distEntry = path.join(projectPath, 'dist/index.js');
    if (await exists(distEntry)) {
      return distEntry;
    }
    
    // Then check main field
    if (packageJson.main) {
      const mainEntry = path.join(projectPath, packageJson.main);
      if (await exists(mainEntry)) {
        return mainEntry;
      }
    }
    
    // Default to index.js in project root
    const defaultEntry = path.join(projectPath, 'index.js');
    if (await exists(defaultEntry)) {
      return defaultEntry;
    }
  } catch (error) {
    console.log('Error finding entry point:', error);
  }
  
  throw new Error('Could not find valid entry point');
}

export async function runNodeServer(entryPoint: string, projectPath: string, args: string[] = [], isEsm: boolean) {
  console.log(`Starting Node.js server with entry point: ${entryPoint}`);
  
  // Create a temporary shell script to run node with the correct flags
  const isWin = process.platform === 'win32';
  const scriptExt = isWin ? 'bat' : 'sh';
  const scriptPath = path.join(projectPath, `run-server.${scriptExt}`);
  
  const nodeFlags = isEsm ? '--experimental-specifier-resolution=node' : '';
  const scriptContent = isWin
    ? `@echo off\nnode ${nodeFlags} "${entryPoint}" %*`
    : `#!/bin/bash\nnode ${nodeFlags} "${entryPoint}" "$@"`;
  
  await fs.writeFile(scriptPath, scriptContent);
  if (!isWin) {
    await fs.chmod(scriptPath, '755');
  }
  
  // Run the script
  const spawnArgs = isWin ? ['/c', scriptPath, ...args] : [scriptPath, ...args];
  const spawnCmd = isWin ? 'cmd' : 'bash';
  
  spawn(spawnCmd, spawnArgs, { cwd: projectPath, stdio: 'inherit' });
}

export async function installNodeProject(projectInfo: ProjectInfo, targetDir: string) {
  const repoDir = path.join(targetDir, projectInfo.owner, projectInfo.repo);
  const fullPath = await cloneOrPullRepo(projectInfo.repoUrl, projectInfo.branch, repoDir);
  const projectPath = path.join(fullPath, projectInfo.path);
  
  if (!projectInfo.isFile) {
    console.log('Installing Node.js dependencies...');
    execSync('npm install', { cwd: projectPath, stdio: 'inherit' });
    
    try {
      console.log('Building project...');
      execSync('npm run build', { cwd: projectPath, stdio: 'inherit' });
    } catch (error) {
      console.log('No build script found, skipping build step');
    }

    // Check if it's an ES module
    projectInfo.isEsm = await isEsModule(projectPath);

    return projectPath;
  }
  return '';
}
