import * as fs from 'fs';
import * as path from 'path';

/**
 * Logs a message if debugging is enabled
 * @param message - The message to log
 * @param isDebugEnabled - Whether debugging is enabled
 */
export function log(message: string, isDebugEnabled: boolean): void {
  if (!isDebugEnabled) return;
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
  const CLASS_NAME_REGEX = /^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/;
  return CLASS_NAME_REGEX.test(className);
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

  function findFilesRecursive(currentDir: string): void {
    const dirEntries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of dirEntries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        findFilesRecursive(fullPath);
      } else if (pattern.test(entry.name)) {
        files.push({ name: entry.name, path: fullPath });
      }
    }
  }

  findFilesRecursive(dir);
  return files;
}
