import * as fs from 'fs/promises';
import * as path from 'path';

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function isEsModule(projectPath: string): Promise<boolean> {
  try {
    const packageJsonPath = path.join(projectPath, 'package.json');
    const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
    return packageJson.type === 'module';
  } catch {
    return false;
  }
}
