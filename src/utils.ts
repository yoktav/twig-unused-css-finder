import * as fs from 'fs';
import * as path from 'path';

/**
 * Logs a message if debugging is enabled
 * @param message - The message to log
 * @param isDebugEnabled - Whether debugging is enabled
 */
export function log(message: string, isDebugEnabled: boolean): void {
  if (isDebugEnabled) return;
  console.info(message);
}

/**
 * Checks if a class name is valid
 * @param className - The class name to check
 * @returns True if the class name is valid, false otherwise
 */
export function isValidClassName(className: string): boolean {
  // Class names must start with a letter, underscore, or hyphen
  // and can be followed by letters, numbers, underscores, or hyphens
  return /^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/.test(className);
}

interface FileInfo {
  name: string;
  path: string;
}

/**
 * Recursively finds files in a directory that match a given pattern
 * @param dir - The directory to search in
 * @param pattern - The pattern to match file names against
 * @returns An array of objects containing file names and paths
 */
export function findFiles(dir: string, pattern: RegExp): FileInfo[] {
  const files: FileInfo[] = [];
  const findFilesRecursive = (currentDir: string) => {
    const dirFiles = fs.readdirSync(currentDir);
    dirFiles.forEach((file) => {
      const fullPath = path.join(currentDir, file);
      if (fs.statSync(fullPath).isDirectory()) {
        findFilesRecursive(fullPath);
      } else if (pattern.test(file)) {
        files.push({ name: file, path: fullPath });
      }
    });
  };
  findFilesRecursive(dir);
  return files;
}
