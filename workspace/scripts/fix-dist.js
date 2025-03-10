#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Paths
const distDir = path.join(rootDir, 'dist');
const workspaceDir = path.join(distDir, 'workspace');

// Check if the workspace directory exists in dist
if (fs.existsSync(workspaceDir) && fs.statSync(workspaceDir).isDirectory()) {
  console.log('Found workspace directory in dist, fixing structure...');
  
  // Function to recursively copy files
  function copyFilesRecursively(sourceDir, targetDir) {
    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    // Read source directory
    const items = fs.readdirSync(sourceDir);
    
    for (const item of items) {
      const sourcePath = path.join(sourceDir, item);
      const targetPath = path.join(targetDir, item);
      
      const stats = fs.statSync(sourcePath);
      
      if (stats.isDirectory()) {
        // Recursively copy subdirectories
        copyFilesRecursively(sourcePath, targetPath);
      } else {
        // Copy file
        fs.copyFileSync(sourcePath, targetPath);
        console.log(`Copied: ${targetPath}`);
      }
    }
  }
  
  // Copy all files from workspace directory to dist
  copyFilesRecursively(workspaceDir, distDir);
  
  // Remove the workspace directory after copying
  function removeDirectoryRecursively(dir) {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach((file) => {
        const curPath = path.join(dir, file);
        if (fs.statSync(curPath).isDirectory()) {
          // Recursive call for directories
          removeDirectoryRecursively(curPath);
        } else {
          // Delete file
          fs.unlinkSync(curPath);
        }
      });
      fs.rmdirSync(dir);
    }
  }
  
  removeDirectoryRecursively(workspaceDir);
  console.log(`Removed: ${workspaceDir}`);
  console.log('Fixed dist directory structure successfully!');
} else {
  console.log('No workspace directory found in dist, nothing to fix.');
}
