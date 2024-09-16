import * as fs from 'fs';
import * as path from 'path';
import { extractClassesFromTemplate, extractClassesFromCss } from './extractors';

interface FileInfo {
  name: string;
  path: string;
}

interface ExtractedClasses {
  classes: string;
  path: string;
}

interface ExtractedSelectors {
  selectors: string[];
  path: string;
}

/**
 * Processes template files to extract CSS classes
 * @param templateFiles - Array of template file objects
 * @returns Array of objects containing extracted classes and file paths
 */
export function processTemplateFilesToExtractClasses(templateFiles: FileInfo[]): ExtractedClasses[] {
  return templateFiles.map((file) => {
    const content = fs.readFileSync(file.path, 'utf8');
    const classes = extractClassesFromTemplate(content);
    return {
      classes: classes.join(' '),
      path: file.path,
    };
  }).filter((item) => item.classes.length > 0);
}

/**
 * Processes CSS files to extract classes
 * @param cssFiles - Array of CSS file objects
 * @returns Array of objects containing extracted selectors and file paths
 */
export function processCssFilesToExtractClasses(cssFiles: FileInfo[]): ExtractedSelectors[] {
  return cssFiles.map((file) => {
    const content = fs.readFileSync(file.path, 'utf8');
    try {
      const selectors = extractClassesFromCss(content, { extractOnly: 'classes' });
      return {
        selectors,
        path: file.path,
      };
    } catch (error) {
      console.error(`Error processing file ${file.path}: ${(error as Error).message}`);
      return null;
    }
  }).filter((item): item is ExtractedSelectors => item !== null && item.selectors.length > 0);
}

/**
 * Writes extracted template classes to a file
 * @param templateClasses - Array of objects containing extracted classes and file paths
 * @param fileName - Name of the output file
 * @param uncssTempDir - Temporary directory for uncss
 */
export function writeTemplateClassesToFile(templateClasses: ExtractedClasses[], fileName: string, uncssTempDir: string): void {
  const outputPath = path.join(uncssTempDir, fileName);
  fs.writeFileSync(outputPath, JSON.stringify(templateClasses, null, 2));
}

/**
 * Writes extracted CSS selectors to a file
 * @param cssSelectors - Array of objects containing extracted selectors and file paths
 * @param fileName - Name of the output file
 * @param uncssTempDir - Temporary directory for uncss
 */
export function writeCssSelectorsToFile(cssSelectors: ExtractedSelectors[], fileName: string, uncssTempDir: string): void {
  const outputPath = path.join(uncssTempDir, fileName);
  fs.writeFileSync(outputPath, JSON.stringify(cssSelectors, null, 2));
}
