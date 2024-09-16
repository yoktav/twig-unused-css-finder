import * as fs from 'fs';
import * as path from 'path';

/**
 * Logs a message if debugging is enabled
 *
 * @param {string} message - The message to log
 * @param {boolean} isDebugEnabled - Whether debugging is enabled
 * @returns {void}
 */
export function log(message: string, isDebugEnabled: boolean): void {
  if (!isDebugEnabled) return;
  console.info(message);
}

/**
 * Checks if a class name is valid
 *
 * Class names must start with a letter, underscore, or hyphen
 * and can be followed by letters, numbers, underscores, or hyphens
 *
 * @param {string} className - The class name to check
 * @returns {boolean} True if the class name is valid, false otherwise
 */
export function isValidClassName(className: string): boolean {
  const CLASS_NAME_REGEX = /^-?[_a-zA-Z]+[_a-zA-Z0-9-]*$/;
  return CLASS_NAME_REGEX.test(className);
}

interface FileInfo {
  name: string;
  path: string;
}

/**
 * Recursively finds files in a directory that match a given pattern
 *
 * @param {string} dir - The directory to search in
 * @param {RegExp} pattern - The regular expression pattern to match file names against
 * @returns {FileInfo[]} An array of FileInfo objects containing file names and paths
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
