export interface Handler {
  isApplicable(): boolean;
  install(): Promise<void>;
  build(): Promise<void>;
  run(args: string[]): Promise<void>;
}

export interface ProjectInfo {
  type: 'node' | 'python' | 'go';
  repoUrl: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
  isFile: boolean;
  isEsm: boolean;
}
