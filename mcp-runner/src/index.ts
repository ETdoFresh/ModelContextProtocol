#!/usr/bin/env node
import { parseGitHubUrl } from './github';
import { installNodeProject, findEntryPoint, runNodeServer } from './node-handler';
import { installPythonProject, findPythonModuleName, runPythonServer } from './python-handler';

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
    const targetDir = 'servers';
    
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
      const moduleName = await findPythonModuleName(projectPath);
      runPythonServer(projectPath, moduleName, serverArgs);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main().catch(console.error);
