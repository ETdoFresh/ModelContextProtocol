import * as path from 'path';
import { execSync } from 'child_process';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import { Handler, ProjectInfo } from './types';
import { exists } from './utils';
import { cloneOrPullRepo } from './git';

export class PythonHandler implements Handler {
  private projectPath: string = '';
  private moduleName: string = '';
  
  constructor(private projectInfo: ProjectInfo, private targetDir: string) {}

  isApplicable(): boolean {
    return this.projectInfo.type === 'python';
  }

  private async findPythonModuleName(): Promise<string> {
    try {
      // Try to find setup.py or pyproject.toml to get the package name
      const pyprojectPath = path.join(this.projectPath, 'pyproject.toml');
      const setupPyPath = path.join(this.projectPath, 'setup.py');
      
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
      return path.basename(this.projectPath).replace(/-/g, '_');
    } catch (error) {
      console.log('Error finding Python module name:', error);
      return path.basename(this.projectPath).replace(/-/g, '_');
    }
  }

  async install(): Promise<void> {
    const repoDir = path.join(this.targetDir, this.projectInfo.owner, this.projectInfo.repo);
    const fullPath = await cloneOrPullRepo(this.projectInfo.repoUrl, this.projectInfo.branch, repoDir);
    this.projectPath = path.join(fullPath, this.projectInfo.path);
    
    if (!this.projectInfo.isFile) {
      console.log('Setting up Python virtual environment...');
      const venvPath = path.join(this.projectPath, '.venv');
      if (!await exists(venvPath)) {
        execSync('python -m venv .venv', { cwd: this.projectPath, stdio: 'inherit' });
      }
      
      const pipCmd = process.platform === 'win32' ? '.venv\\Scripts\\pip' : '.venv/bin/pip';
      console.log('Installing Python dependencies...');
      if (await exists(path.join(this.projectPath, 'requirements.txt'))) {
        execSync(`${pipCmd} install -r requirements.txt`, { cwd: this.projectPath, stdio: 'inherit' });
      } else if (await exists(path.join(this.projectPath, 'pyproject.toml'))) {
        execSync(`${pipCmd} install .`, { cwd: this.projectPath, stdio: 'inherit' });
      }
    }
  }

  async build(): Promise<void> {
    if (!this.projectInfo.isFile) {
      this.moduleName = await this.findPythonModuleName();
    }
  }

  async run(args: string[]): Promise<void> {
    if (!this.moduleName) {
      throw new Error('Module name not found. Make sure to call build() first.');
    }

    const pythonCmd = process.platform === 'win32' ? '.venv\\Scripts\\python' : '.venv/bin/python';
    console.log(`Starting Python server with module: ${this.moduleName}`);
    
    const pythonArgs = ['-m', this.moduleName, ...args];
    spawn(pythonCmd, pythonArgs, { cwd: this.projectPath, stdio: 'inherit' });
  }
}
