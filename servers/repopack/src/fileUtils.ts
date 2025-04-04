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
  // Add output format
  outputFormat?: 'xml' | 'md' | 'txt';
}

export interface FindFilesResult {
  filePaths: string[];
  ignorePatterns: string[];
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

  const effectiveIgnorePatterns: string[] = []; // Renamed for clarity

  // 1. Add default ignores
  if (useDefaultPatterns) {
    effectiveIgnorePatterns.push(...defaultIgnoreList);
  }

  // 2. Add custom ignores
  if (ignorePatterns) {
    effectiveIgnorePatterns.push(...ignorePatterns.split(',').map(p => p.trim()));
  }

  // 3. Add .gitignore rules (prepare ignore instance)
  const ig = ignore();
  let gitignoreRules: string[] = []; // Combined rules from all found .gitignores
  let currentDir = resolvedDir;

  if (useGitignore) {
      console.error("Searching for .gitignore files upwards from:", resolvedDir);
      while (true) {
          const gitignorePath = path.join(currentDir, '.gitignore');
          try {
              // Check if file exists (using stat for potential errors)
              await fs.stat(gitignorePath);
              console.error("Found .gitignore at:", gitignorePath);
              const rules = await readGitignoreRulesFromFile(gitignorePath);
              // Add rules from this file - order matters for precedence in some ignore implementations
              // Adding parent rules first might be conceptually clearer, let's reverse later
              gitignoreRules.push(...rules);
          } catch (error) {
              // If stat fails with ENOENT, file doesn't exist, continue upwards
              if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) {
                  console.error(`Error checking for .gitignore at ${gitignorePath}:`, error);
                  // Don't stop search for other errors, but log them
              }
          }

          const parentDir = path.dirname(currentDir);
          if (parentDir === currentDir) {
              // Reached the root
              break;
          }
          currentDir = parentDir;
      }
      // Reverse the rules so the most specific (.gitignore in deeper dirs) are added last
      // This aligns with how git itself handles precedence
      ig.add(gitignoreRules.reverse());
      console.error("Total .gitignore rules added:", gitignoreRules.length);
  }

  // Combine all ignore sources for globby and the final list
  // Note: globby doesn't use the gitignore rules directly here
  const globbyIgnorePatterns = [...effectiveIgnorePatterns]; // Use defaults and custom for globby
  // For the final XML output, show all patterns including gitignore
  const allIgnorePatterns = [...effectiveIgnorePatterns, ...gitignoreRules];

  // Use globby to find files
  const files = await globby(patternsToInclude, {
    cwd: resolvedDir,
    ignore: globbyIgnorePatterns, // Use combined patterns here
    onlyFiles: true,
    dot: true, // Include dotfiles
    absolute: false, // Keep paths relative to rootDir
    followSymbolicLinks: false,
  });

  // Filter using the 'ignore' package for more precise gitignore handling
  const filteredFiles = files.filter(file => !ig.ignores(file)); // Filter based on gitignore instance

  return {
    filePaths: filteredFiles,
    ignorePatterns: allIgnorePatterns // Return all patterns used
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
    return [
        "- Some files may have been excluded based on ignore rules.",
        "- Binary files and files larger than 5MB are not included.",
        options.useGitignore ? "- Files matching patterns in .gitignore are excluded." : "- .gitignore rules were not used.",
        options.useDefaultPatterns ? "- Files matching default ignore patterns are excluded." : "- Default ignore patterns were not used.",
        options.removeComments ? "- Code comments have been removed from supported file types." : "",
        options.removeEmptyLines ? "- Empty lines have been removed." : "",
    ].filter(Boolean);
} 