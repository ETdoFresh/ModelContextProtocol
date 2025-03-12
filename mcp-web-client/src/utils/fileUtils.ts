/**
 * Utility functions for working with files in the application
 */

/**
 * Determine the file type based on extension
 * @param filename The file name or path
 * @returns The file type (code, text, markdown, etc.)
 */
export const getFileType = (filename: string): 'code' | 'text' | 'markdown' | 'image' | 'binary' | 'unknown' => {
  if (!filename) return 'unknown';
  
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  // Code files
  const codeExtensions = [
    'js', 'jsx', 'ts', 'tsx', 'py', 'java', 'c', 'cpp', 'cs', 'go', 'rb', 'php',
    'swift', 'kt', 'sh', 'bash', 'html', 'css', 'scss', 'json', 'xml', 'yaml', 'yml'
  ];
  
  // Markdown files
  const markdownExtensions = ['md', 'markdown', 'mdown', 'mdx'];
  
  // Text files
  const textExtensions = ['txt', 'text', 'log', 'csv', 'tsv'];
  
  // Image files
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'ico'];
  
  // Binary files (generally not viewable directly)
  const binaryExtensions = [
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'tar', 'gz',
    'rar', '7z', 'exe', 'dll', 'so', 'dylib', 'bin', 'dat'
  ];
  
  if (codeExtensions.includes(extension)) return 'code';
  if (markdownExtensions.includes(extension)) return 'markdown';
  if (textExtensions.includes(extension)) return 'text';
  if (imageExtensions.includes(extension)) return 'image';
  if (binaryExtensions.includes(extension)) return 'binary';
  
  return 'unknown';
};

/**
 * Get the appropriate language for syntax highlighting based on file extension
 * @param filename The file name or path
 * @returns The language identifier for syntax highlighting
 */
export const getLanguage = (filename: string): string => {
  if (!filename) return 'text';
  
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  
  // Map file extensions to language identifiers for syntax highlighting
  const languageMap: Record<string, string> = {
    // JavaScript and TypeScript
    'js': 'javascript',
    'jsx': 'jsx',
    'ts': 'typescript',
    'tsx': 'tsx',
    
    // Web
    'html': 'html',
    'css': 'css',
    'scss': 'scss',
    
    // Data formats
    'json': 'json',
    'xml': 'xml',
    'yaml': 'yaml',
    'yml': 'yaml',
    
    // Python
    'py': 'python',
    
    // Java/C#/C++
    'java': 'java',
    'c': 'c',
    'cpp': 'cpp',
    'cs': 'csharp',
    
    // Other languages
    'go': 'go',
    'rb': 'ruby',
    'php': 'php',
    'swift': 'swift',
    'kt': 'kotlin',
    
    // Shell
    'sh': 'bash',
    'bash': 'bash',
    
    // Markdown
    'md': 'markdown',
    'markdown': 'markdown',
    'mdown': 'markdown',
    'mdx': 'markdown',
    
    // Plain text
    'txt': 'text',
    'text': 'text',
    'log': 'text',
    'csv': 'text',
    'tsv': 'text'
  };
  
  return languageMap[extension] || 'text';
};

/**
 * Get the file size string formatted for human readability
 * @param bytes File size in bytes
 * @returns Formatted file size string (e.g., "1.5 MB")
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Format a date for display in file metadata
 * @param date The date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
  return date.toLocaleString();
};

/**
 * Check if a file is too large for efficient rendering
 * @param sizeInBytes The file size in bytes
 * @returns Whether the file is considered large
 */
export const isLargeFile = (sizeInBytes: number): boolean => {
  const MAX_SIZE = 500 * 1024; // 500 KB
  return sizeInBytes > MAX_SIZE;
};
