import {
  readFileTools,
  handleReadFile,
  handleReadMultipleFiles,
} from './read-file.js';

import {
  writeFileTools,
  handleWriteFile,
} from './write-file.js';

import {
  editFileTools,
  handleEditFile,
} from './edit-file.js';

import {
  directoryOperationTools,
  handleCreateDirectory,
  handleListDirectory,
  handleDirectoryTree,
} from './directory-operations.js';

import {
  moveFileTools,
  handleMoveFile,
} from './move-file.js';

import {
  searchFileTools,
  handleSearchFiles,
} from './search-files.js';

import {
  fileInfoTools,
  handleGetFileInfo,
} from './file-info.js';

import {
  allowedDirectoryTools,
  handleListAllowedDirectories,
  handleAddAllowedDirectory,
  handleRemoveAllowedDirectory,
} from './allowed-directories.js';

// Re-export everything
export * from './read-file.js';
export * from './write-file.js';
export * from './edit-file.js';
export * from './directory-operations.js';
export * from './move-file.js';
export * from './search-files.js';
export * from './file-info.js';
export * from './allowed-directories.js';

// Combine all tool definitions
export const allTools = [
  ...readFileTools,
  ...writeFileTools,
  ...editFileTools,
  ...directoryOperationTools,
  ...moveFileTools,
  ...searchFileTools,
  ...fileInfoTools,
  ...allowedDirectoryTools,
];

// Export all handlers
export const handlers = {
  read_file: handleReadFile,
  read_multiple_files: handleReadMultipleFiles,
  write_file: handleWriteFile,
  edit_file: handleEditFile,
  create_directory: handleCreateDirectory,
  list_directory: handleListDirectory,
  directory_tree: handleDirectoryTree,
  move_file: handleMoveFile,
  search_files: handleSearchFiles,
  get_file_info: handleGetFileInfo,
  list_allowed_directories: handleListAllowedDirectories,
  add_allowed_directory: handleAddAllowedDirectory,
  remove_allowed_directory: handleRemoveAllowedDirectory,
} as const;

export type HandlerName = keyof typeof handlers;
