import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { Handler, ProjectInfo } from './types';
import { cloneOrPullRepo } from './git';

export class GoHandler implements Handler {
    private projectPath: string = '';
    
    constructor(private projectInfo: ProjectInfo, private targetDir: string) {}

    isApplicable(): boolean {
        return this.projectInfo.type === 'go';
    }

    async install(): Promise<void> {
        const repoDir = join(this.targetDir, this.projectInfo.owner, this.projectInfo.repo);
        const fullPath = await cloneOrPullRepo(this.projectInfo.repoUrl, this.projectInfo.branch, repoDir);
        this.projectPath = join(fullPath, this.projectInfo.path);

        if (!this.projectInfo.isFile) {
            console.log('Installing Go dependencies...');
            try {
                // Run go mod download to install dependencies
                execSync('go mod download', {
                    cwd: this.projectPath,
                    stdio: 'inherit'
                });
            } catch (error) {
                throw new Error(`Failed to install Go dependencies: ${error}`);
            }
        }
    }

    async build(): Promise<void> {
        console.log('Building Go project...');
        try {
            // Build the Go project
            execSync('go build -o mcp-server', {
                cwd: this.projectPath,
                stdio: 'inherit'
            });
        } catch (error) {
            throw new Error(`Failed to build Go project: ${error}`);
        }
    }

    async run(args: string[]): Promise<void> {
        console.log('Running Go MCP server...');
        try {
            const serverPath = join(this.projectPath, 'mcp-server');
            // Check if the server executable exists
            if (!existsSync(serverPath)) {
                throw new Error('Server executable not found. Build may have failed.');
            }

            // Execute the server with any provided arguments
            const command = `${serverPath} ${args.join(' ')}`;
            execSync(command, {
                cwd: this.projectPath,
                stdio: 'inherit'
            });
        } catch (error) {
            throw new Error(`Failed to run Go MCP server: ${error}`);
        }
    }
}
