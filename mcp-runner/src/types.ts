export interface ProjectInfo {
  type: 'node' | 'python';
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
  isFile: boolean;
  isEsm: boolean;
}
