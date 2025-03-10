#!/usr/bin/env node

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Parse arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: nghx <github_repo_link> [args...]');
  process.exit(1);
}

// Extract the GitHub repo URL and remaining arguments
const githubRepoUrl = args[0];
const remainingArgs = args.slice(1);

// Parse GitHub URL to extract owner, repo, branch and subpath
function parseGitHubUrl(url) {
  try {
    console.log(`Parsing GitHub URL: ${url}`);
    
    // Extract owner/repo/branch/path from URL
    const githubRegex = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)(?:\/(.+))?)?$/;
    const match = url.match(githubRegex);
    
    if (!match) {
      throw new Error(`Invalid GitHub URL format: ${url}`);
    }
    
    const owner = match[1];
    let repo = match[2];
    // Remove .git extension if present
    if (repo.endsWith('.git')) {
      repo = repo.slice(0, -4);
    }
    
    const branch = match[3] || 'main';
    const subPath = match[4] || '';
    
    console.log(`Parsed URL components:`);
    console.log(`- Owner: ${owner}`);
    console.log(`- Repo: ${repo}`);
    console.log(`- Branch: ${branch}`);
    console.log(`- SubPath: ${subPath || '(root)'}`);
    
    return { owner, repo, branch, subPath };
  } catch (error) {
    console.error(`Error parsing GitHub URL: ${error.message}`);
    process.exit(1);
  }
}

// Get cache directory
function getCacheDir() {
  try {
    let cacheDir;
    if (process.platform === 'win32') {
      cacheDir = path.join(os.homedir(), 'AppData', 'Local', 'npm-cache', '_nghx');
    } else {
      // For macOS and Linux
      cacheDir = path.join(os.homedir(), '.npm-cache', '_nghx');
    }
    
    // Create cache directory if it doesn't exist
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
      console.log(`Created cache directory: ${cacheDir}`);
    }
    
    return cacheDir;
  } catch (error) {
    console.error(`Error creating cache directory: ${error.message}`);
    process.exit(1);
  }
}

// Check if repository was recently pulled
function wasRecentlyPulled(owner, repo, branch, cacheDir) {
  try {
    const lastPullFile = path.join(cacheDir, owner, repo, branch, 'last-pull.txt');
    
    if (!fs.existsSync(lastPullFile)) {
      return false;
    }
    
    const lastPullTime = parseInt(fs.readFileSync(lastPullFile, 'utf8').trim());
    const currentTime = Date.now();
    const elapsedTimeMs = currentTime - lastPullTime;
    const elapsedTimeMin = elapsedTimeMs / (1000 * 60);
    
    console.log(`Last pull was ${elapsedTimeMin.toFixed(2)} minutes ago`);
    
    // Return true if less than one minute has passed
    return elapsedTimeMin < 1;
  } catch (error) {
    console.error(`Error checking last pull time: ${error.message}`);
    // If there's an error reading the file, assume it wasn't recently pulled
    return false;
  }
}

// Get current git commit SHA
function getCurrentCommitSha(repoDir) {
  try {
    const result = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: repoDir,
      encoding: 'utf8',
      shell: true
    });
    
    if (result.status !== 0) {
      throw new Error(`Failed to get current commit SHA: ${result.stderr}`);
    }
    
    return result.stdout.trim();
  } catch (error) {
    console.error(`Error getting current commit SHA: ${error.message}`);
    return null;
  }
}

// Check if dependencies need to be installed based on commit SHA
function needsDependencyInstallation(npxPath, repoDir) {
  try {
    const lastUpdateFile = path.join(npxPath, 'last-update.txt');
    
    if (!fs.existsSync(lastUpdateFile)) {
      return true;
    }
    
    const lastCommitSha = fs.readFileSync(lastUpdateFile, 'utf8').trim();
    const currentCommitSha = getCurrentCommitSha(repoDir);
    
    if (!currentCommitSha) {
      // If we can't get the current SHA, assume we need to install
      return true;
    }
    
    console.log(`Last installation commit: ${lastCommitSha}`);
    console.log(`Current commit: ${currentCommitSha}`);
    
    // Return true if the commit SHA has changed
    return lastCommitSha !== currentCommitSha;
  } catch (error) {
    console.error(`Error checking dependency installation status: ${error.message}`);
    // If there's an error, assume dependencies need to be installed
    return true;
  }
}

// Update the last-pull.txt file with current timestamp
function updateLastPullTime(owner, repo, branch, cacheDir) {
  try {
    const lastPullFile = path.join(cacheDir, owner, repo, branch, 'last-pull.txt');
    const currentTime = Date.now();
    
    fs.writeFileSync(lastPullFile, currentTime.toString(), 'utf8');
    console.log(`Updated last-pull.txt with timestamp: ${currentTime}`);
  } catch (error) {
    console.error(`Error updating last pull time: ${error.message}`);
    // Continue execution even if writing the timestamp fails
  }
}

// Update the last-update.txt file with current commit SHA
function updateLastDependencyInstallSha(npxPath, repoDir) {
  try {
    const lastUpdateFile = path.join(npxPath, 'last-update.txt');
    const currentCommitSha = getCurrentCommitSha(repoDir);
    
    if (currentCommitSha) {
      fs.writeFileSync(lastUpdateFile, currentCommitSha, 'utf8');
      console.log(`Updated last-update.txt with commit SHA: ${currentCommitSha}`);
    }
  } catch (error) {
    console.error(`Error updating last dependency installation SHA: ${error.message}`);
    // Continue execution even if writing the SHA fails
  }
}

// Clone or update repository
function prepareRepository(owner, repo, branch, cacheDir) {
  try {
    const repoDir = path.join(cacheDir, owner, repo, branch);
    console.log(`Repository directory: ${repoDir}`);
    
    // Check if directory exists
    const repoExists = fs.existsSync(repoDir);
    
    if (repoExists) {
      console.log('Repository already exists. Checking for updates...');
      
      // Check if the repository was recently pulled
      if (wasRecentlyPulled(owner, repo, branch, cacheDir)) {
        console.log('Repository was recently pulled (less than 1 minute ago). Skipping update.');
        return repoDir;
      }
      
      // Update the repository
      const updateResult = spawnSync('git', ['fetch', 'origin'], {
        cwd: repoDir,
        stdio: 'inherit',
        shell: true
      });
      
      if (updateResult.status !== 0) {
        throw new Error(`Failed to fetch updates: ${updateResult.stderr}`);
      }
      
      const resetResult = spawnSync('git', ['reset', '--hard', `origin/${branch}`], {
        cwd: repoDir,
        stdio: 'inherit',
        shell: true
      });
      
      if (resetResult.status !== 0) {
        throw new Error(`Failed to reset to origin/${branch}: ${resetResult.stderr}`);
      }
      
      // Update the last pull time
      updateLastPullTime(owner, repo, branch, cacheDir);
    } else {
      console.log('Cloning repository...');
      // Create parent directories if they don't exist
      fs.mkdirSync(path.dirname(repoDir), { recursive: true });
      
      // Clone the repository
      const cloneResult = spawnSync('git', [
        'clone',
        '--branch', branch,
        `https://github.com/${owner}/${repo}.git`,
        repoDir
      ], {
        stdio: 'inherit',
        shell: true
      });
      
      if (cloneResult.status !== 0) {
        throw new Error(`Failed to clone repository: ${cloneResult.stderr}`);
      }
      
      // Update the last pull time after cloning
      updateLastPullTime(owner, repo, branch, cacheDir);
    }
    
    return repoDir;
  } catch (error) {
    console.error(`Error preparing repository: ${error.message}`);
    process.exit(1);
  }
}

// Run npx with the local path
function runNpx(npxPath, args, repoDir) {
  try {
    console.log(`Running npx against path: ${npxPath}`);
    console.log(`Additional arguments: ${args.length > 0 ? args.join(' ') : '(none)'}`);
    
    // Check if the path exists
    if (!fs.existsSync(npxPath)) {
      throw new Error(`Path does not exist: ${npxPath}`);
    }
    
    // Install dependencies if needed based on commit SHA
    if (needsDependencyInstallation(npxPath, repoDir)) {
      console.log(`Installing dependencies in: ${npxPath}`);
      const installResult = spawnSync('npm', ['install'], {
        cwd: npxPath,
        stdio: 'inherit',
        shell: true
      });
      
      if (installResult.status !== 0) {
        throw new Error(`npm install failed with exit code ${installResult.status}`);
      }
      
      // Update the last dependency installation SHA
      updateLastDependencyInstallSha(npxPath, repoDir);
    } else {
      console.log('Dependencies already installed for current commit. Skipping installation.');
    }
    
    // Run npx with the local path and remaining arguments
    const result = spawnSync('npx', [npxPath, ...args], {
      stdio: 'inherit',
      shell: true
    });
    
    if (result.status !== 0) {
      throw new Error(`npx command failed with exit code ${result.status}`);
    }
  } catch (error) {
    console.error(`Error running npx: ${error.message}`);
    process.exit(1);
  }
}

// Main function
function main() {
  try {
    // Parse GitHub URL
    const { owner, repo, branch, subPath } = parseGitHubUrl(githubRepoUrl);
    
    // Get cache directory
    const cacheDir = getCacheDir();
    
    // Prepare repository (clone or update)
    const repoDir = prepareRepository(owner, repo, branch, cacheDir);
    
    // Determine the final path to run npx against
    let npxPath = repoDir;
    if (subPath) {
      npxPath = path.join(repoDir, subPath);
      console.log(`Using subpath: ${subPath}`);
    }
    
    // Run npx
    runNpx(npxPath, remainingArgs, repoDir);
    
    console.log('Command completed successfully!');
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

// Run the main function
main();
