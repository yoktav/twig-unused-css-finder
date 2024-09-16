import * as fs from 'fs';
import * as path from 'path';
import { extractClassesFromTemplate, extractClassesFromCss } from './extractors';

export interface FileInfo {
  name: string;
  path: string;
}

export interface ExtractedData {
  data: string[] | string;
  path: string;
}

/**
 * Reads the content of a file
 *
 * @param {string} filePath - The path to the file
 * @returns {string} The content of the file
 */
function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

/**
 * Processes files using the provided extractor function and data processor
 *
 * @template T
 * @param {FileInfo[]} files - Array of file information objects
 * @param {(content: string) => string[]} extractorFn - Function to extract data from file content
 * @param {(data: string[]) => T['data']} dataProcessor - Function to process extracted data
 * @returns {T[]} Array of processed data objects
 */
function processFiles<T extends ExtractedData>(
  files: FileInfo[],
  extractorFn: (content: string) => string[],
  dataProcessor: (data: string[]) => T['data']
): T[] {
  return files
    .map((file) => {
      try {
        const content = readFileContent(file.path);
        const extractedData = extractorFn(content);
        return {
          data: dataProcessor(extractedData),
          path: file.path,
        } as T;
      } catch (error) {
        console.error(`Error processing file ${file.path}: ${(error as Error).message}`);
        return null;
      }
    })
    .filter((item): item is T => item !== null && item.data.length > 0);
}

/**
 * Processes template files to extract classes
 *
 * @param {FileInfo[]} templateFiles - Array of template file information objects
 * @returns {ExtractedData[]} Array of extracted class data
 */
export function processTemplateFilesToExtractClasses(templateFiles: FileInfo[]): ExtractedData[] {
  return processFiles<ExtractedData>(
    templateFiles,
    extractClassesFromTemplate,
    (classes) => classes.join(' ')
  );
}

/**
 * Processes CSS files to extract classes
 *
 * @param {FileInfo[]} cssFiles - Array of CSS file information objects
 * @returns {ExtractedData[]} Array of extracted CSS selector data
 */
export function processCssFilesToExtractClasses(cssFiles: FileInfo[]): ExtractedData[] {
  return processFiles<ExtractedData>(
    cssFiles,
    (content) => extractClassesFromCss(content, { extractOnly: 'classes' }),
    (selectors) => selectors
  );
}

/**
 * Writes data to a file in the specified directory
 *
 * @param {ExtractedData[]} data - Array of extracted data objects
 * @param {string} fileName - Name of the output file
 * @param {string} uncssTempDir - Path to the temporary directory
 */
function writeDataToFile(data: ExtractedData[], fileName: string, uncssTempDir: string): void {
  const outputPath = path.join(uncssTempDir, fileName);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
}

/**
 * Writes extracted template classes to a file
 *
 * @param {ExtractedData[]} templateClasses - Array of extracted template class data
 * @param {string} fileName - Name of the output file
 * @param {string} uncssTempDir - Path to the temporary directory
 */
export function writeTemplateClassesToFile(templateClasses: ExtractedData[], fileName: string, uncssTempDir: string): void {
  writeDataToFile(templateClasses, fileName, uncssTempDir);
}

/**
 * Writes extracted CSS selectors to a file
 *
 * @param {ExtractedData[]} cssSelectors - Array of extracted CSS selector data
 * @param {string} fileName - Name of the output file
 * @param {string} uncssTempDir - Path to the temporary directory
 */
export function writeCssSelectorsToFile(cssSelectors: ExtractedData[], fileName: string, uncssTempDir: string): void {
  writeDataToFile(cssSelectors, fileName, uncssTempDir);
}
