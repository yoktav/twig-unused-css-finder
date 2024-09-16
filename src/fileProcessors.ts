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

// Generic function to read file content
function readFileContent(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

// Generic function to process files
function processFiles<T extends ExtractedData>(
  files: FileInfo[],
  extractorFn: (content: string) => string[],
  dataProcessor: (data: string[]) => T['data']
): T[] {
  return files
    .map((file) => {
      const content = readFileContent(file.path);
      try {
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

// Process template files
export function processTemplateFilesToExtractClasses(templateFiles: FileInfo[]): ExtractedData[] {
  return processFiles<ExtractedData>(
    templateFiles,
    extractClassesFromTemplate,
    (classes) => classes.join(' ')
  );
}

// Process CSS files
export function processCssFilesToExtractClasses(cssFiles: FileInfo[]): ExtractedData[] {
  return processFiles<ExtractedData>(
    cssFiles,
    (content) => extractClassesFromCss(content, { extractOnly: 'classes' }),
    (selectors) => selectors
  );
}

// Generic function to write data to file
function writeDataToFile(data: ExtractedData[], fileName: string, uncssTempDir: string): void {
  const outputPath = path.join(uncssTempDir, fileName);
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
}

// Write template classes to file
export function writeTemplateClassesToFile(templateClasses: ExtractedData[], fileName: string, uncssTempDir: string): void {
  writeDataToFile(templateClasses, fileName, uncssTempDir);
}

// Write CSS selectors to file
export function writeCssSelectorsToFile(cssSelectors: ExtractedData[], fileName: string, uncssTempDir: string): void {
  writeDataToFile(cssSelectors, fileName, uncssTempDir);
}
