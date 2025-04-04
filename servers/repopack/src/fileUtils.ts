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
  sourceIdentifier?: string; // Added: Can be local path or remote URL
  includePatterns?: string;
  ignorePatterns?: string;
  removeComments?: boolean;
  removeEmptyLines?: boolean;
  useGitignore?: boolean;
  useDefaultPatterns?: boolean;
  // Added for XML generation options
  fileSummary?: boolean;
  directoryStructure?: boolean;
  // Add output format
  outputFormat?: 'xml' | 'md' | 'txt';
}

export interface FindFilesResult {
  filePaths: string[];
  defaultIgnorePatterns: string[];
  inputIgnorePatterns: string[];
  gitignorePatterns: string[];
}

// --- File Searching Logic ---

// Reads rules from a specific .gitignore file path
async function readGitignoreRulesFromFile(gitignorePath: string): Promise<string[]> {
  try {
    const content = await fs.readFile(gitignorePath, 'utf-8');
    return content.split('\n')
      .map(line => line.trim()) // Trim lines
      .filter((line: string) => line !== '' && !line.startsWith('#'));
  } catch (error) {
    // Ignore if file doesn't exist or other read errors
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        // File not found is expected, return empty
    } else {
        console.error(`Error reading .gitignore file ${gitignorePath}:`, error);
    }
    return [];
  }
}

export async function findFiles(options: PackCodebaseOptions): Promise<FindFilesResult> {
  const {
    directory,
    includePatterns,
    ignorePatterns: inputIgnorePatternsStr, // Rename for clarity
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

  const defaultIgnores = useDefaultPatterns ? [...defaultIgnoreList] : [];
  const inputIgnores = inputIgnorePatternsStr ? inputIgnorePatternsStr.split(',').map(p => p.trim()) : [];

  // Globby uses default and input ignores
  const globbyIgnorePatterns: string[] = [...defaultIgnores, ...inputIgnores];

  // Gitignore handling
  const ig = ignore();
  let gitignoreRules: string[] = [];
  let currentDir = resolvedDir;

  if (useGitignore) {
      console.error("Searching for .gitignore files upwards from:", resolvedDir);
      while (true) {
          const gitignorePath = path.join(currentDir, '.gitignore');
          try {
              await fs.stat(gitignorePath);
              console.error("Found .gitignore at:", gitignorePath);
              const rules = await readGitignoreRulesFromFile(gitignorePath);
              gitignoreRules.push(...rules);
          } catch (error) {
              if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
                  console.error(`Error checking for .gitignore at ${gitignorePath}:`, error);
              }
          }

          const parentDir = path.dirname(currentDir);
          if (parentDir === currentDir) {
              break;
          }
          currentDir = parentDir;
      }
      // Reverse the rules for correct precedence and add to ignore instance
      gitignoreRules = gitignoreRules.reverse();
      ig.add(gitignoreRules);
      console.error("Total .gitignore rules added:", gitignoreRules.length);
  }

  // Use globby to find files, ignoring based on default and input patterns
  const files = await globby(patternsToInclude, {
    cwd: resolvedDir,
    ignore: globbyIgnorePatterns, // Use only default+input for initial glob scan
    onlyFiles: true,
    dot: true,
    absolute: false,
    followSymbolicLinks: false,
  });

  // Filter using the 'ignore' package for gitignore rules
  const filteredFiles = files.filter(file => !ig.ignores(file));

  return {
    filePaths: filteredFiles,
    // Return the categorized patterns
    defaultIgnorePatterns: defaultIgnores,
    inputIgnorePatterns: inputIgnores,
    gitignorePatterns: gitignoreRules
  };
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

// --- Summary Generation Logic ---

export function generateSummaryNotes(options: PackCodebaseOptions): string[] {
    const notes: string[] = [];
    const source = options.sourceIdentifier || options.directory; // Use identifier if available

    notes.push(`Source: ${source}`);

    if (options.removeComments) {
        notes.push("- Code comments have been removed from supported file types.");
    }
    if (options.removeEmptyLines) {
        notes.push("- Empty lines have been removed.");
    }
    if (options.useDefaultPatterns) {
        notes.push("- Files matching default ignore patterns are excluded.");
    } else {
        notes.push("- Default ignore patterns were not used.");
    }
    if (options.useGitignore) {
        notes.push("- Some files may have been excluded based on ignore rules.");
    }
    if (options.removeComments) {
        notes.push("- Binary files and files larger than 5MB are not included.");
    }

    return notes;
} 