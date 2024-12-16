import axios from 'axios';
import { ProjectInfo } from './types';
import * as path from 'path';

export async function parseGitHubUrl(url: string): Promise<ProjectInfo> {
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