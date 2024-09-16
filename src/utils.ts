import * as fs from 'fs';
import * as path from 'path';
import type { ExtractedData } from './fileProcessors';

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

export interface FileInfo {
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

/**
 * Writes data to a file in the specified directory
 *
 * @param {ExtractedData[]} data - Array of extracted data objects
 * @param {string} fileName - Name of the output file
 * @param {string} uncssTempDir - Path to the temporary directory
 */
export function writeDataToFile(data: ExtractedData[], fileName: string, uncssTempDir: string): void {
  const outputPath = path.join(uncssTempDir, fileName);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
}

/**
 * Clears the temporary directory or creates it if it doesn't exist
 *
 * @param tempDir - Path to the temporary directory
 * @param options - Options for the operation
 */
export function clearOrCreateTempDir(tempDir: string, options: { isDebug: boolean }): void {
  if (fs.existsSync(tempDir)) {
    // Directory exists, clear its contents
    fs.readdirSync(tempDir).forEach((file) => {
      const filePath = path.join(tempDir, file);
      fs.unlinkSync(filePath);
    });
    log(`[INFO] Cleared contents of ${tempDir}`, options.isDebug);
  } else {
    // Directory doesn't exist, create it
    fs.mkdirSync(tempDir);
    log(`[INFO] Created directory ${tempDir}`, options.isDebug);
  }
}

/**
 * Creates a flattened version of extracted classes
 *
 * @param {string} inputFileName - Name of the input file
 * @param {string} outputFileName - Name of the output file
 * @param {Object} options - Options for the operation
 * @param {boolean} options.isDebug - Whether to show debug information
 * @param {string} options.uncssTempDir - Path to the temporary directory
 */
export function createFlattenedClasses(
  inputFileName: string,
  outputFileName: string,
  options: { isDebug: boolean; uncssTempDir: string }
): void {
  const inputPath = path.join(options.uncssTempDir, inputFileName);
  const outputPath = path.join(options.uncssTempDir, outputFileName);
  const items: ExtractedData[] = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const flattenedItems = new Set<string>();

  items.forEach((item) => {
    if (typeof item.data === 'string') {
      item.data.split(' ').forEach((cls: string) => flattenedItems.add(cls));
    } else if (Array.isArray(item.data)) {
      item.data.forEach((cls: string) => flattenedItems.add(cls));
    }
  });

  fs.writeFileSync(outputPath, JSON.stringify(Array.from(flattenedItems), null, 2));
  log(`[INFO] Flattened classes written to: ${outputPath}`, options.isDebug);
}

/**
 * Checks if a class should be ignored based on the ignoredClassPatterns
 *
 * @param className - The class name to check
 * @param ignoredClassPatterns - Array of RegExp patterns for classes to ignore
 * @returns {boolean} True if the class should be ignored, false otherwise
 */
export function isIgnoredClass(className: string, ignoredClassPatterns: RegExp[]): boolean {
  return ignoredClassPatterns.some((pattern) => pattern.test(className));
}

/**
 * Removes background images from a CSS content string
 *
 * @param {string} content - The CSS content to process
 * @returns {string} The processed CSS content
 */
export function removeBackgroundImages(content: string): string {
  return content.replace(/background(-image)?:\s*url\s*\([^)]*\)[^;]*;/g, '');
}

/**
 * Removes url functions from a CSS content string
 *
 * @param {string} content - The CSS content to process
 * @returns {string} The processed CSS content
 */
export function removeUrlFunctions(content: string): string {
  return content.replace(/url\s*\([^)]*\)/g, '');
}

/**
 * Reads the content of a file
 *
 * @param {string} filePath - The path to the file
 * @returns {string} The content of the file
 */
export function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}
