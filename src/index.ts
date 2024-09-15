import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  UNCSS_TEMP_DIR,
  TWIG_BASE_DIR,
  TWIG_PATTERN,
  VUE_BASE_DIR,
  VUE_PATTERN,
  CSS_BASE_DIR,
  CSS_PATTERN,
  CLASSES_FROM_TEMPLATES_FILE_NAME,
  CLASSES_FROM_CSS_FILE_NAME,
  CLASSES_FROM_TEMPLATES_FLATTENED_FILE_NAME,
  CLASSES_FROM_CSS_FLATTENED_FILE_NAME,
  UNUSED_CSS_CLASSES_REPORT_FILE_NAME,
  IGNORED_CLASS_PATTERNS,
} from './constants';
import { log, findFiles } from './utils';
import {
  processTemplateFilesToExtractClasses,
  processCssFilesToExtractClasses,
  writeTemplateClassesToFile,
  writeCssSelectorsToFile,
} from './fileProcessors';

/**
 * Clears the UNCSS_TEMP_DIR directory or creates it if it doesn't exist
 */
function clearOrCreateTempDir(): void {
  if (fs.existsSync(UNCSS_TEMP_DIR)) {
    // Directory exists, clear its contents
    fs.readdirSync(UNCSS_TEMP_DIR).forEach((file) => {
      const filePath = path.join(UNCSS_TEMP_DIR, file);
      fs.unlinkSync(filePath);
    });
    log(`Cleared contents of ${UNCSS_TEMP_DIR}`);
  } else {
    // Directory doesn't exist, create it
    fs.mkdirSync(UNCSS_TEMP_DIR);
    log(`Created directory ${UNCSS_TEMP_DIR}`);
  }
}

/**
 * Creates a flattened version of extracted classes
 * @param inputFileName - Name of the input file
 * @param outputFileName - Name of the output file
 */
function createFlattenedClasses(inputFileName: string, outputFileName: string): void {
  const inputPath = path.join(UNCSS_TEMP_DIR, inputFileName);
  const outputPath = path.join(UNCSS_TEMP_DIR, outputFileName);
  const items = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const flattenedItems = new Set<string>();

  items.forEach((item: { classes?: string | string[], selectors?: string[] }) => {
    if (Array.isArray(item.classes)) {
      item.classes.forEach((cls) => flattenedItems.add(cls));
    } else if (typeof item.classes === 'string') {
      item.classes.split(' ').forEach((cls) => flattenedItems.add(cls));
    }
    if (Array.isArray(item.selectors)) {
      item.selectors.forEach((selector) => flattenedItems.add(selector));
    }
  });

  fs.writeFileSync(outputPath, JSON.stringify(Array.from(flattenedItems), null, 2));
  log(`Flattened classes written to: ${outputPath}`);
}

/**
 * Checks if a class should be ignored based on the IGNORED_CLASS_PATTERNS
 * @param className - The class name to check
 * @returns True if the class should be ignored, false otherwise
 */
function isIgnoredClass(className: string): boolean {
  return IGNORED_CLASS_PATTERNS.some((pattern) => pattern.test(className));
}

/**
 * Compares flattened classes from template and CSS files and generates a diff report
 */
function getUnusedCssClasses(): void {
  const templateClassesPath = path.join(UNCSS_TEMP_DIR, CLASSES_FROM_TEMPLATES_FLATTENED_FILE_NAME);
  const cssClassesPath = path.join(UNCSS_TEMP_DIR, CLASSES_FROM_CSS_FLATTENED_FILE_NAME);

  const templateClassesList = new Set(JSON.parse(fs.readFileSync(templateClassesPath, 'utf8')));
  const cssClassesList = new Set(JSON.parse(fs.readFileSync(cssClassesPath, 'utf8')));

  const cssClassesNotFoundInTemplates = Array.from(cssClassesList).filter((cls) => !templateClassesList.has(cls) && !isIgnoredClass(cls));

  const templateClassesNotFoundInCss = Array.from(templateClassesList).filter((cls) => !cssClassesList.has(cls) && !isIgnoredClass(cls));

  const diffReport = {
    cssClassesNotFoundInTemplates,
    templateClassesNotFoundInCss,
  };

  const outputPath = path.join(UNCSS_TEMP_DIR, UNUSED_CSS_CLASSES_REPORT_FILE_NAME);
  fs.writeFileSync(outputPath, JSON.stringify(diffReport, null, 2));
  log(`Diff report written to: ${outputPath}`);
}

interface InitOptions {
  SHOW_HELPER_INFOS?: boolean;
}

/**
 * Initializes and runs the unused CSS classes check
 * @param options - Options for the initialization
 */
function init({ SHOW_HELPER_INFOS = false }: InitOptions = {}): void {
  console.info('------------ START CheckUnusedCssClasses ------------');

  log('[TASK] Clearing or creating temp directory', SHOW_HELPER_INFOS);
  clearOrCreateTempDir();

  log('[TASK] Reading template files', SHOW_HELPER_INFOS);
  const templateFiles = [
    ...findFiles(TWIG_BASE_DIR, TWIG_PATTERN),
    ...findFiles(VUE_BASE_DIR, VUE_PATTERN),
  ];

  log('[TASK] Processing template files and extracting CSS classes', SHOW_HELPER_INFOS);
  const templateClasses = processTemplateFilesToExtractClasses(templateFiles);

  log('[TASK] Reading CSS files', SHOW_HELPER_INFOS);
  const cssFiles = findFiles(CSS_BASE_DIR, CSS_PATTERN);

  log('[TASK] Processing CSS files', SHOW_HELPER_INFOS);
  const cssSelectors = processCssFilesToExtractClasses(cssFiles);

  log('[TASK] Writing extracted CSS classes to file', SHOW_HELPER_INFOS);
  writeTemplateClassesToFile(templateClasses, CLASSES_FROM_TEMPLATES_FILE_NAME);

  log('[TASK] Writing extracted CSS selectors to file', SHOW_HELPER_INFOS);
  writeCssSelectorsToFile(cssSelectors, CLASSES_FROM_CSS_FILE_NAME);

  log('[TASK] Creating flattened version of template classes', SHOW_HELPER_INFOS);
  createFlattenedClasses(CLASSES_FROM_TEMPLATES_FILE_NAME, CLASSES_FROM_TEMPLATES_FLATTENED_FILE_NAME);

  log('[TASK] Creating flattened version of CSS classes', SHOW_HELPER_INFOS);
  createFlattenedClasses(CLASSES_FROM_CSS_FILE_NAME, CLASSES_FROM_CSS_FLATTENED_FILE_NAME);

  log('[TASK] Comparing flattened classes', SHOW_HELPER_INFOS);
  getUnusedCssClasses();

  console.info('------------ END CheckUnusedCssClasses ------------');
}

init({ SHOW_HELPER_INFOS: false });
