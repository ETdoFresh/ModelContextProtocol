import * as path from 'path';
import { execSync } from 'child_process';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import { Handler, ProjectInfo } from './types';
import { exists, isEsModule } from './utils';
import { cloneOrPullRepo } from './git';

export class NodeHandler implements Handler {
  private projectPath: string = '';
  private entryPoint: string = '';
  private isEsm: boolean = false;
  
  constructor(private projectInfo: ProjectInfo, private targetDir: string) {}

  isApplicable(): boolean {
    return this.projectInfo.type === 'node';
  }

  private async findEntryPoint(): Promise<string> {
    try {
      const packageJsonPath = path.join(this.projectPath, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      // Check dist directory first
      const distEntry = path.join(this.projectPath, 'dist/index.js');
      if (await exists(distEntry)) {
        return distEntry;
      }
      
      // Then check main field
      if (packageJson.main) {
        const mainEntry = path.join(this.projectPath, packageJson.main);
        if (await exists(mainEntry)) {
          return mainEntry;
        }
      }
      
      // Default to index.js in project root
      const defaultEntry = path.join(this.projectPath, 'index.js');
      if (await exists(defaultEntry)) {
        return defaultEntry;
      }
    } catch (error) {
      console.log('Error finding entry point:', error);
    }
    
    throw new Error('Could not find valid entry point');
  }

  async install(): Promise<void> {
    const repoDir = path.join(this.targetDir, this.projectInfo.owner, this.projectInfo.repo);
    const fullPath = await cloneOrPullRepo(this.projectInfo.repoUrl, this.projectInfo.branch, repoDir);
    this.projectPath = path.join(fullPath, this.projectInfo.path);
    
    if (!this.projectInfo.isFile) {
      console.log('Installing Node.js dependencies...');
      execSync('npm install', { cwd: this.projectPath, stdio: 'inherit' });
      this.isEsm = await isEsModule(this.projectPath);
    }
  }

  async build(): Promise<void> {
    if (!this.projectInfo.isFile) {
      try {
        console.log('Building project...');
        execSync('npm run build', { cwd: this.projectPath, stdio: 'inherit' });
      } catch (error) {
        console.log('No build script found, skipping build step');
      }
      this.entryPoint = await this.findEntryPoint();
    }
  }

  async run(args: string[]): Promise<void> {
    if (!this.entryPoint) {
      throw new Error('Entry point not found. Make sure to call build() first.');
    }

    console.log(`Starting Node.js server with entry point: ${this.entryPoint}`);
    
    // Create a temporary shell script to run node with the correct flags
    const isWin = process.platform === 'win32';
    const scriptExt = isWin ? 'bat' : 'sh';
    const scriptPath = path.join(this.projectPath, `run-server.${scriptExt}`);
    
    const nodeFlags = this.isEsm ? '--experimental-specifier-resolution=node' : '';
    const scriptContent = isWin
      ? `@echo off\nnode ${nodeFlags} "${this.entryPoint}" %*`
      : `#!/bin/bash\nnode ${nodeFlags} "${this.entryPoint}" "$@"`;
    
    await fs.writeFile(scriptPath, scriptContent);
    if (!isWin) {
      await fs.chmod(scriptPath, '755');
    }
    
    // Run the script
    const spawnArgs = isWin ? ['/c', scriptPath, ...args] : [scriptPath, ...args];
    const spawnCmd = isWin ? 'cmd' : 'bash';
    
    spawn(spawnCmd, spawnArgs, { cwd: this.projectPath, stdio: 'inherit' });
  }
}
