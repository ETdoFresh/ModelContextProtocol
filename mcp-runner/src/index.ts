#!/usr/bin/env node
import { parseGitHubUrl } from './github';
import { NodeHandler } from './node-handler';
import { PythonHandler } from './python-handler';
import { GoHandler } from './go-handler';
import { Handler } from './types';

async function main() {
  // Get all arguments after the executable name
  const args = process.argv.slice(1);
  
  // Find the GitHub URL
  const githubUrlIndex = args.findIndex(arg => arg.startsWith('https://github.com/'));
  if (githubUrlIndex === -1) {
    console.error('Error: GitHub URL is required');
    process.exit(1);
  }

  // Take all arguments after the URL
  const url = args[githubUrlIndex];
  const serverArgs = args.slice(githubUrlIndex + 1);

  try {
    const projectInfo = await parseGitHubUrl(url);
    const targetDir = 'mcp-servers';
    
    console.log(`Processing ${projectInfo.type} project from ${projectInfo.repoUrl}...`);
    
    // Create handlers
    const handlers: Handler[] = [
      new NodeHandler(projectInfo, targetDir),
      new PythonHandler(projectInfo, targetDir),
      new GoHandler(projectInfo, targetDir)
    ];

    // Find applicable handler
    const handler = handlers.find(h => h.isApplicable());
    if (!handler) {
      throw new Error('No suitable handler found for this project type');
    }

    // Install dependencies
    await handler.install();
    console.log('Installation complete!');

    // Build the project
    await handler.build();
    console.log('Build complete!');

    // Run the server
    console.log('Starting server...');
    await handler.run(serverArgs);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
