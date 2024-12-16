#!/usr/bin/env node
const axios = require('axios').default;
import * as path from 'path';
import * as fs from 'fs/promises';
import { execSync, spawn } from 'child_process';

interface ProjectInfo {
  type: 'node' | 'python';
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
  isFile: boolean;
  isEsm: boolean;
}

async function isEsModule(projectPath: string): Promise<boolean> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    return packageJson.type === 'module';
  } catch {
    return false;
  }
}

async function parseGitHubUrl(url: string): Promise<ProjectInfo> {
  const urlParts = url.replace('https://github.com/', '').split('/');
  const owner = urlParts[0];
  const repo = urlParts[1];
  const type = urlParts[2]; // 'tree' or 'blob'
  const branch = urlParts[3];
  const pathParts = urlParts.slice(4);
  const projectPath = pathParts.join('/');
  
  const isFile = type === 'blob';
  const repoUrl = `https://github.com/${owner}/${repo}.git`;

  if (isFile) {
    const ext = path.extname(projectPath);
    const type = ext === '.py' ? 'python' : 'node';
    return { type, repoUrl, owner, repo, branch, path: projectPath, isFile, isEsm: false };
  }

  try {
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${projectPath}?ref=${branch}`;
    const response = await axios.get(apiUrl);
    const files = response.data;

    const hasPackageJson = files.some((f: any) => f.name === 'package.json');
    const hasRequirements = files.some((f: any) => f.name === 'requirements.txt');
    const hasPyProject = files.some((f: any) => f.name === 'pyproject.toml');

    const type = hasPackageJson ? 'node' : (hasRequirements || hasPyProject) ? 'python' : 'node';
    return { type, repoUrl, owner, repo, branch, path: projectPath, isFile, isEsm: false };
  } catch (error) {
    console.error('Error fetching repository contents:', error);
    throw error;
  }
}

async function cloneOrPullRepo(repoUrl: string, branch: string, targetDir: string) {
  try {
    const gitDir = path.join(targetDir, '.git');
    const isRepo = await exists(gitDir);

    if (isRepo) {
      // If repo exists, just pull latest changes
      console.log(`Repository exists at ${targetDir}, pulling latest changes...`);
      execSync(`cd ${targetDir} && git pull origin ${branch}`, { stdio: 'inherit' });
    } else {
      // Create target directory if it doesn't exist
      await fs.mkdir(targetDir, { recursive: true });

      // Clone repository
      console.log(`Cloning repository to ${targetDir}...`);
      execSync(`git clone -b ${branch} ${repoUrl} ${targetDir}`, { stdio: 'inherit' });
    }
  } catch (error) {
    console.error('Error during git operations:', error);
    throw error;
  }
}

async function findEntryPoint(projectPath: string): Promise<string> {
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

async function findPythonModuleName(projectPath: string): Promise<string> {
  try {
    // Try to find setup.py or pyproject.toml to get the package name
    const pyprojectPath = path.join(projectPath, 'pyproject.toml');
    const setupPyPath = path.join(projectPath, 'setup.py');
    
    if (await exists(pyprojectPath)) {
      const content = await fs.readFile(pyprojectPath, 'utf-8');
      const match = content.match(/name\s*=\s*["']([^"']+)["']/);
      if (match) {
        return match[1].replace(/-/g, '_');
      }
    }
    
    if (await exists(setupPyPath)) {
      const content = await fs.readFile(setupPyPath, 'utf-8');
      const match = content.match(/name\s*=\s*["']([^"']+)["']/);
      if (match) {
        return match[1].replace(/-/g, '_');
      }
    }
    
    // Fallback to directory name
    return path.basename(projectPath).replace(/-/g, '_');
  } catch (error) {
    console.log('Error finding Python module name:', error);
    return path.basename(projectPath).replace(/-/g, '_');
  }
}

async function installNodeProject(projectInfo: ProjectInfo, targetDir: string) {
  const repoDir = path.join(targetDir, projectInfo.owner, projectInfo.repo);
  const fullPath = path.join(repoDir, projectInfo.path);
  
  if (!projectInfo.isFile) {
    await cloneOrPullRepo(projectInfo.repoUrl, projectInfo.branch, repoDir);
    
    console.log('Installing Node.js dependencies...');
    execSync('npm install', { cwd: fullPath, stdio: 'inherit' });
    
    try {
      console.log('Building project...');
      execSync('npm run build', { cwd: fullPath, stdio: 'inherit' });
    } catch (error) {
      console.log('No build script found, skipping build step');
    }

    // Check if it's an ES module
    projectInfo.isEsm = await isEsModule(fullPath);

    return fullPath;
  }
  return '';
}

async function installPythonProject(projectInfo: ProjectInfo, targetDir: string) {
  const repoDir = path.join(targetDir, projectInfo.owner, projectInfo.repo);
  const fullPath = path.join(repoDir, projectInfo.path);
  
  if (!projectInfo.isFile) {
    await cloneOrPullRepo(projectInfo.repoUrl, projectInfo.branch, repoDir);
    
    console.log('Setting up Python virtual environment...');
    const venvPath = path.join(fullPath, '.venv');
    if (!await exists(venvPath)) {
      execSync('python -m venv .venv', { cwd: fullPath, stdio: 'inherit' });
    }
    
    const pipCmd = process.platform === 'win32' ? '.venv\\Scripts\\pip' : '.venv/bin/pip';
    console.log('Installing Python dependencies...');
    if (await exists(path.join(fullPath, 'requirements.txt'))) {
      execSync(`${pipCmd} install -r requirements.txt`, { cwd: fullPath, stdio: 'inherit' });
    } else if (await exists(path.join(fullPath, 'pyproject.toml'))) {
      execSync(`${pipCmd} install .`, { cwd: fullPath, stdio: 'inherit' });
    }

    return fullPath;
  }
  return '';
}

async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

async function runNodeServer(entryPoint: string, projectPath: string, args: string[] = [], isEsm: boolean) {
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

async function main() {
  // Get all arguments after the executable name
  const args = process.argv.slice(1);
  
  // Find the GitHub URL
  const githubUrlIndex = args.findIndex(arg => arg.startsWith('https://github.com/'));
  if (githubUrlIndex === -1) {
    console.error('Error: GitHub URL is required');
    process.exit(1);
  }

  const url = args[githubUrlIndex];
  // Take all arguments after the URL
  const serverArgs = args.slice(githubUrlIndex + 1);

  try {
    const projectInfo = await parseGitHubUrl(url);
    const targetDir = path.resolve('mcp-servers');
    
    await fs.mkdir(targetDir, { recursive: true });
    
    console.log(`Installing ${projectInfo.type} project from ${projectInfo.repoUrl}...`);
    
    let projectPath = '';
    if (projectInfo.type === 'node') {
      projectPath = await installNodeProject(projectInfo, targetDir);
    } else {
      projectPath = await installPythonProject(projectInfo, targetDir);
    }
    
    if (!projectPath) {
      console.log('No installation needed for single file.');
      return;
    }

    console.log('Installation complete! Starting server...');
    
    if (projectInfo.type === 'node') {
      const entryPoint = await findEntryPoint(projectPath);
      await runNodeServer(entryPoint, projectPath, serverArgs, projectInfo.isEsm);
    } else {
      const pythonCmd = process.platform === 'win32' ? '.venv\\Scripts\\python' : '.venv/bin/python';
      const moduleName = await findPythonModuleName(projectPath);
      console.log(`Starting Python server with module: ${moduleName}`);
      
      const pythonArgs = ['-m', moduleName, ...serverArgs];
      spawn(pythonCmd, pythonArgs, { cwd: projectPath, stdio: 'inherit' });
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
