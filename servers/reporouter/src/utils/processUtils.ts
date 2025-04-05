import { spawnSync } from 'node:child_process';

/**
 * Simple logger to stderr.
 */
export const logError = (...args: any[]) => {
  console.error(...args);
};

/**
 * Gets the appropriate npm command based on the operating system.
 * @returns 'npm.cmd' on Windows, 'npm' otherwise.
 */
export function getNpmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

/**
 * Filters process.env to remove undefined values.
 * @returns A filtered environment object.
 */
export function getFilteredEnv(): Record<string, string> {
  const filteredEnv: Record<string, string> = {};
  for (const key in process.env) {
    const value = process.env[key];
    if (value !== undefined) {
      filteredEnv[key] = value;
    }
  }
  return filteredEnv;
}

/**
 * Ensures dependencies are installed and the package is built for a given directory.
 * @param packageDir The root directory of the package.
 * @param packageName A descriptive name for logging (e.g., 'OpenRouter Server').
 * @throws Error if install or build fails.
 */
export function ensurePackageBuilt(packageDir: string, packageName: string): void {
  const npmCmd = getNpmCommand();
  const env = getFilteredEnv();

  logError(`Ensuring ${packageName} dependencies and build in ${packageDir}...`);

  try {
    // Run npm install
    logError(`Running command: ${npmCmd} install in ${packageDir}`);
    const installResult = spawnSync(npmCmd, ['install'], { cwd: packageDir, stdio: 'inherit', env: env, shell: true });
    if (installResult.status !== 0) {
      const errorMsg = installResult.error?.message || `Install failed with status ${installResult.status}`;
      logError(`Error installing ${packageName} dependencies: ${errorMsg}`);
      if (installResult.error && (installResult.error as any).code === 'ENOENT') {
        logError(`Failed to find command: ${npmCmd}. Ensure Node.js/npm is installed and in PATH.`);
      }
      throw new Error(`Failed to install dependencies for ${packageName}.`);
    }
    logError(`${packageName} dependencies installed.`);

    // Run npm run build
    logError(`Running command: ${npmCmd} run build in ${packageDir}`);
    const buildResult = spawnSync(npmCmd, ['run', 'build'], { cwd: packageDir, stdio: 'inherit', env: env, shell: true });
    if (buildResult.status !== 0) {
        const errorMsg = buildResult.error?.message || `Build failed with status ${buildResult.status}`;
        logError(`Error building ${packageName}: ${errorMsg}`);
        if (buildResult.error && (buildResult.error as any).code === 'ENOENT') {
            logError(`Failed to find command: ${npmCmd}. Ensure Node.js/npm is installed and in PATH.`);
        }
        throw new Error(`Failed to build ${packageName}.`);
    }
    logError(`${packageName} built successfully.`);
  } catch (error: any) {
     logError(`Error executing setup for ${packageName}: ${error.message}`);
     // Re-throw the specific error to be caught by the main run function if needed
     throw error;
  }
} 