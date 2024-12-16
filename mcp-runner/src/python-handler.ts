import * as path from 'path';
import { execSync } from 'child_process';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import { ProjectInfo } from './types';
import { exists } from './utils';
import { cloneOrPullRepo } from './git';

export async function findPythonModuleName(projectPath: string): Promise<string> {
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

export async function installPythonProject(projectInfo: ProjectInfo, targetDir: string) {
  const repoDir = path.join(targetDir, projectInfo.owner, projectInfo.repo);
  const fullPath = await cloneOrPullRepo(projectInfo.repoUrl, projectInfo.branch, repoDir);
  const projectPath = path.join(fullPath, projectInfo.path);
  
  if (!projectInfo.isFile) {
    console.log('Setting up Python virtual environment...');
    const venvPath = path.join(projectPath, '.venv');
    if (!await exists(venvPath)) {
      execSync('python -m venv .venv', { cwd: projectPath, stdio: 'inherit' });
    }
    
    const pipCmd = process.platform === 'win32' ? '.venv\\Scripts\\pip' : '.venv/bin/pip';
    console.log('Installing Python dependencies...');
    if (await exists(path.join(projectPath, 'requirements.txt'))) {
      execSync(`${pipCmd} install -r requirements.txt`, { cwd: projectPath, stdio: 'inherit' });
    } else if (await exists(path.join(projectPath, 'pyproject.toml'))) {
      execSync(`${pipCmd} install .`, { cwd: projectPath, stdio: 'inherit' });
    }

    return projectPath;
  }
  return '';
}

export function runPythonServer(projectPath: string, moduleName: string, args: string[] = []) {
  const pythonCmd = process.platform === 'win32' ? '.venv\\Scripts\\python' : '.venv/bin/python';
  console.log(`Starting Python server with module: ${moduleName}`);
  
  const pythonArgs = ['-m', moduleName, ...args];
  spawn(pythonCmd, pythonArgs, { cwd: projectPath, stdio: 'inherit' });
}
