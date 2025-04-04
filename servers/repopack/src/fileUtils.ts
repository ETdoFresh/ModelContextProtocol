// Add this at the top or in a separate .d.ts file
// declare module 'strip-comments';

import fs from 'node:fs/promises';
import path from 'node:path';
import strip from 'strip-comments';
import { globby } from 'globby';
import ignore from 'ignore';
import { isBinary } from 'istextorbinary';
import { defaultIgnoreList } from './config.js';

export interface FileData {
  path: string;
  content: string;
}

export interface PackCodebaseOptions {
  directory: string;
  includePatterns?: string;
  ignorePatterns?: string;
  removeComments?: boolean;
  removeEmptyLines?: boolean;
  useGitignore?: boolean;
  useDefaultPatterns?: boolean;
  // Added for XML generation options
  fileSummary?: boolean;
  directoryStructure?: boolean;
}

// --- File Searching Logic ---

async function readGitignore(rootDir: string): Promise<string[]> {
  const gitignorePath = path.join(rootDir, '.gitignore');
  try {
    const content = await fs.readFile(gitignorePath, 'utf-8');
    return content.split('\n').filter((line: string) => line.trim() !== '' && !line.startsWith('#'));
  } catch (error) {
    // Ignore if .gitignore doesn't exist
    return [];
  }
}

export async function findFiles(options: PackCodebaseOptions): Promise<string[]> {
  const {
    directory,
    includePatterns,
    ignorePatterns,
    useGitignore = true,
    useDefaultPatterns = true,
  } = options;

  const resolvedDir = path.resolve(directory);

  // Ensure directory exists
  try {
    const stats = await fs.stat(resolvedDir);
    if (!stats.isDirectory()) {
      throw new Error(`Path is not a directory: ${resolvedDir}`);
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        throw new Error(`Directory not found: ${resolvedDir}`);
    }
    throw error; // Re-throw other errors
  }


  const patternsToInclude = includePatterns ? includePatterns.split(',').map(p => p.trim()) : ['**/*'];

  let patternsToIgnore: string[] = [];

  // 1. Add default ignores
  if (useDefaultPatterns) {
    patternsToIgnore.push(...defaultIgnoreList);
  }

  // 2. Add custom ignores
  if (ignorePatterns) {
    patternsToIgnore.push(...ignorePatterns.split(',').map(p => p.trim()));
  }

  // 3. Add .gitignore rules
  const ig = ignore();
  if (useGitignore) {
      const gitignoreRules = await readGitignore(resolvedDir);
      ig.add(gitignoreRules);
      // Add gitignore patterns to globby ignore list as well for efficiency
      patternsToIgnore.push(...gitignoreRules);
  }

  // Use globby to find files
  const files = await globby(patternsToInclude, {
    cwd: resolvedDir,
    ignore: patternsToIgnore,
    onlyFiles: true,
    dot: true, // Include dotfiles
    absolute: false, // Keep paths relative to rootDir
    followSymbolicLinks: false,
  });

  // Filter using the 'ignore' package for more precise gitignore handling
  return files.filter(file => !ig.ignores(file));
}


// --- File Processing Logic ---

// Simple comment removal using strip-comments
function removeFileComments(content: string, filePath: string): string {
    // Basic language detection based on extension
    const ext = path.extname(filePath).toLowerCase();
    let lang: string | undefined = undefined;

    // Add more mappings as needed
    if (['.js', '.jsx', '.ts', '.tsx', '.java', '.c', '.h', '.cpp', '.hpp', '.cs', '.go', '.swift', '.kt', '.dart'].includes(ext)) {
        lang = 'javascript'; // Close enough for C-style comments
    } else if (['.py'].includes(ext)) {
        lang = 'python'; // strip-comments has limitations with python docstrings
    } else if (['.rb'].includes(ext)) {
        lang = 'ruby';
    } else if (['.php'].includes(ext)) {
        lang = 'php';
    } else if (['.html', '.xml', '.vue', '.svelte'].includes(ext)) {
        lang = 'html';
    } else if (['.css', '.scss', '.less', '.sass'].includes(ext)) {
        lang = 'css';
    } else if (['.sh', '.bash', '.zsh', '.yaml', '.yml'].includes(ext)) {
        lang = 'shell'; // Or 'python' for YAML hash comments
    } else if (['.sql'].includes(ext)) {
        lang = 'sql';
    }

    try {
        return lang ? strip(content, { language: lang, preserveNewlines: true }) : content;
    } catch (error) {
        console.error(`Error removing comments from ${filePath}: ${error}`);
        return content; // Return original content on error
    }
}

function removeFileEmptyLines(content: string): string {
  return content.split('\n').filter((line: string) => line.trim() !== '').join('\n');
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit per file

export async function readFileContent(filePath: string, baseDir: string): Promise<FileData | null> {
  const fullPath = path.resolve(baseDir, filePath);
  try {
    const stats = await fs.stat(fullPath);
    if (stats.size > MAX_FILE_SIZE_BYTES) {
        console.error(`Skipping large file: ${filePath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);
        return null;
    }

    // Use istextorbinary to detect binary files more reliably
    const fileBuffer = await fs.readFile(fullPath);
    if (isBinary(null, fileBuffer)) {
        console.error(`Skipping binary file: ${filePath}`);
        return null;
    }

    // If not binary, decode as UTF-8 (common default)
    // More sophisticated encoding detection could be added here if needed (e.g., using jschardet)
    const content = fileBuffer.toString('utf-8');

    return { path: filePath, content };
  } catch (error) {
    console.error(`Error reading file ${filePath}: ${error}`);
    return null;
  }
}

export async function processFiles(
    filePaths: string[],
    options: PackCodebaseOptions
): Promise<FileData[]> {
    const processedFiles: FileData[] = [];
    const { directory, removeComments = false, removeEmptyLines = false } = options;

    for (const filePath of filePaths) {
        const fileData = await readFileContent(filePath, directory);
        if (fileData) {
            let content = fileData.content;
            if (removeComments) {
                content = removeFileComments(content, filePath);
            }
            if (removeEmptyLines) {
                content = removeFileEmptyLines(content);
            }
            processedFiles.push({ ...fileData, content: content.trim() }); // Trim start/end whitespace
        }
    }
    return processedFiles;
}


// --- Directory Structure Generation ---

interface TreeNode {
    name: string;
    children: TreeNode[];
    isDirectory: boolean;
}

const createTreeNode = (name: string, isDirectory: boolean): TreeNode => ({ name, children: [], isDirectory });

function addPathToTree(root: TreeNode, filePath: string): void {
    const parts = filePath.split(path.sep).filter(part => part !== '');
    let currentNode = root;

    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        const isLastPart = i === parts.length - 1;
        let child = currentNode.children.find((c) => c.name === part);

        if (!child) {
            child = createTreeNode(part, !isLastPart); // Assume directory unless last part
            currentNode.children.push(child);
            // Sort children: directories first, then alphabetically
            currentNode.children.sort((a, b) => {
                if (a.isDirectory !== b.isDirectory) {
                    return a.isDirectory ? -1 : 1;
                }
                return a.name.localeCompare(b.name);
            });
        }
        // Ensure intermediate nodes are marked as directories
        if (!isLastPart) {
            child.isDirectory = true;
        }
        currentNode = child;
    }
}

function treeToString(node: TreeNode, prefix = ''): string {
    let result = '';
    const childrenCount = node.children.length;
    for (let i = 0; i < childrenCount; i++) {
        const child = node.children[i];
        const isLastChild = i === childrenCount - 1;
        const connector = isLastChild ? '└── ' : '├── ';
        const linePrefix = prefix + connector;
        const childPrefix = prefix + (isLastChild ? '    ' : '│   ');

        result += `${linePrefix}${child.name}${child.isDirectory ? '/' : ''}\n`;
        if (child.isDirectory) {
            result += treeToString(child, childPrefix);
        }
    }
    return result;
}

export function generateDirectoryStructure(filePaths: string[]): string {
    const root: TreeNode = createTreeNode('.', true); // Use '.' for the root
    filePaths.forEach(filePath => addPathToTree(root, filePath));
    return treeToString(root).trim();
} 