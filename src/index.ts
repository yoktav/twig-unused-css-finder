import * as fs from 'fs';
import * as path from 'path';
import { log, findFiles } from './utils';
import {
  processTemplateFilesToExtractClasses,
  processCssFilesToExtractClasses,
  writeTemplateClassesToFile,
  writeCssSelectorsToFile,
  ExtractedData
} from './fileProcessors';

/**
 * Clears the temporary directory or creates it if it doesn't exist
 *
 * @param tempDir - Path to the temporary directory
 * @param options - Options for the operation
 */
function clearOrCreateTempDir(tempDir: string, options: { isDebug: boolean }): void {
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
 * @param {string} inputFileName - Name of the input file
 * @param {string} outputFileName - Name of the output file
 * @param {Object} options - Options for the operation
 * @param {boolean} options.isDebug - Whether to show debug information
 * @param {string} options.uncssTempDir - Path to the temporary directory
 */
function createFlattenedClasses(
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
 * @param className - The class name to check
 * @param ignoredClassPatterns - Array of RegExp patterns for classes to ignore
 * @returns True if the class should be ignored, false otherwise
 */
function isIgnoredClass(className: string, ignoredClassPatterns: RegExp[]): boolean {
  return ignoredClassPatterns.some((pattern) => pattern.test(className));
}

/**
 * Compares flattened classes from template and CSS files and generates a diff report
 * @param {Object} options - Options for the comparison
 * @param {boolean} options.isDebug - Whether to show debug information
 * @param {string} options.uncssTempDir - Path to the temporary directory
 * @param {RegExp[]} options.ignoredClassPatterns - Array of RegExp patterns for classes to ignore
 * @param {string} options.outputFile - Name of the output file for the diff report
 * @param {string} options.classesFromTemplatesFlattenedFileName - Name of the file containing flattened template classes
 * @param {string} options.classesFromCssFlattenedFileName - Name of the file containing flattened CSS classes
 */
function getUnusedCssClasses(options: {
  isDebug: boolean;
  uncssTempDir: string;
  ignoredClassPatterns: RegExp[];
  outputFile: string;
  classesFromTemplatesFlattenedFileName: string;
  classesFromCssFlattenedFileName: string;
}): void {
  const templateClassesPath = path.join(options.uncssTempDir, options.classesFromTemplatesFlattenedFileName);
  const cssClassesPath = path.join(options.uncssTempDir, options.classesFromCssFlattenedFileName);

  const templateClassesList = new Set<string>(JSON.parse(fs.readFileSync(templateClassesPath, 'utf8')));
  const cssClassesList = new Set<string>(JSON.parse(fs.readFileSync(cssClassesPath, 'utf8')));

  const cssClassesNotFoundInTemplates = Array.from(cssClassesList).filter(
    (cls) => !templateClassesList.has(cls) && !isIgnoredClass(cls, options.ignoredClassPatterns)
  );

  const templateClassesNotFoundInCss = Array.from(templateClassesList).filter(
    (cls) => !cssClassesList.has(cls) && !isIgnoredClass(cls, options.ignoredClassPatterns)
  );

  const diffReport = {
    cssClassesNotFoundInTemplates,
    templateClassesNotFoundInCss,
  };

  const outputPath = path.join(options.uncssTempDir, options.outputFile);
  fs.writeFileSync(outputPath, JSON.stringify(diffReport, null, 2));
  log(`[INFO] Diff report written to: ${outputPath}`, options.isDebug);
}

export interface TwigUnusedCssFinderOptions {
  /**
   * The directory where temporary files will be stored.
   * @default './uncss-stats'
   */
  uncssTempDir?: string;

  /**
   * The directory where the Twig templates are located.
   * @default './templates'
   */
  twigDir?: string;

  /**
   * The pattern to match Twig files.
   * @default /\.twig$/
   */
  twigPattern?: RegExp;

  /**
   * The directory where Vue files are located.
   * @default './assets/js'
   */
  vueDir?: string;

  /**
   * The pattern to match Vue files.
   * @default /\.vue$/
   */
  vuePattern?: RegExp;

  /**
   * The directory where the CSS files are located.
   * @default './public/assets'
   */
  cssDir?: string;

  /**
   * The pattern to match CSS files.
   * @default /\.css$/
   */
  cssPattern?: RegExp;

  /**
   * An array of RegExp patterns for classes to ignore.
   * @default [/^js-/]
   */
  ignoredClassPatterns?: RegExp[];

  /**
   * The filename for storing all classes from CSS.
   * @default 'all_classes_from_css.json'
   */
  classesFromCssFileName?: string;

  /**
   * The filename for storing flattened classes from CSS.
   * @default 'all_classes_from_css_flattened.json'
   */
  classesFromCssFlattenedFileName?: string;

  /**
   * The filename for storing all classes from templates.
   * @default 'all_classes_from_vue_and_twig.json'
   */
  classesFromTemplatesFileName?: string;

  /**
   * The filename for storing flattened classes from templates.
   * @default 'all_classes_from_vue_and_twig_flattened.json'
   */
  classesFromTemplatesFlattenedFileName?: string;

  /**
   * The file where the unused CSS classes report will be written.
   * @default 'unused_css_classes_report.json'
   */
  outputFile?: string;

  /**
   * Whether to show debug information.
   * @default false
   */
  isDebug?: boolean;

  /**
   * Whether to show helper information messages.
   * @default false
   */
  showHelperInfos?: boolean;
}

/**
 * Initializes and runs the unused CSS classes check
 * @param {TwigUnusedCssFinderOptions} options - Options for the initialization
 */
function initFn(options: TwigUnusedCssFinderOptions = {}): void {
  console.info('------------ [START] Twig unused css finder ------------');

  const {
    uncssTempDir = './uncss-stats',
    twigDir = './templates',
    twigPattern = /\.twig$/,
    vueDir = './assets/js',
    vuePattern = /\.vue$/,
    cssDir = './public/assets',
    cssPattern = /\.css$/,
    ignoredClassPatterns = [/^js-/],
    classesFromCssFileName = 'all_classes_from_css.json',
    classesFromCssFlattenedFileName = 'all_classes_from_css_flattened.json',
    classesFromTemplatesFileName = 'all_classes_from_vue_and_twig.json',
    classesFromTemplatesFlattenedFileName = 'all_classes_from_vue_and_twig_flattened.json',
    outputFile = 'unused_css_classes_report.json',
    isDebug = false,
    showHelperInfos = false,
  } = options;

  log('[TASK] Clearing or creating temp directory', isDebug);
  clearOrCreateTempDir(uncssTempDir, { isDebug });

  log('[TASK] Reading template files', isDebug);
  const templateFiles = [
    ...findFiles(twigDir, twigPattern),
    ...findFiles(vueDir, vuePattern),
  ];

  log('[TASK] Processing template files and extracting CSS classes', isDebug);
  const templateClasses: ExtractedData[] = processTemplateFilesToExtractClasses(templateFiles);

  log('[TASK] Reading CSS files', isDebug);
  const cssFiles = findFiles(cssDir, cssPattern);

  log('[TASK] Processing CSS files', isDebug);
  const cssSelectors: ExtractedData[] = processCssFilesToExtractClasses(cssFiles);

  log('[TASK] Writing extracted CSS classes to file', isDebug);
  writeTemplateClassesToFile(templateClasses, classesFromTemplatesFileName, uncssTempDir);

  log('[TASK] Writing extracted CSS selectors to file', isDebug);
  writeCssSelectorsToFile(cssSelectors, classesFromCssFileName, uncssTempDir);

  log('[TASK] Creating flattened version of template classes', isDebug);
  createFlattenedClasses(classesFromTemplatesFileName, classesFromTemplatesFlattenedFileName, { isDebug, uncssTempDir });

  log('[TASK] Creating flattened version of CSS classes', isDebug);
  createFlattenedClasses(classesFromCssFileName, classesFromCssFlattenedFileName, { isDebug, uncssTempDir });

  log('[TASK] Comparing flattened classes', isDebug);
  getUnusedCssClasses({
    isDebug,
    uncssTempDir,
    ignoredClassPatterns,
    outputFile,
    classesFromTemplatesFlattenedFileName,
    classesFromCssFlattenedFileName
  });

  console.info('------------ [END] Twig unused css finder ------------');
}

/**
 * Runs the unused CSS classes check for Twig and Vue templates
 * @param {Object} options - Configuration options
 * @param {string} [options.uncssTempDir='./uncss-stats'] - Temporary directory for uncss
 * @param {string} [options.twigDir='./templates'] - Directory containing Twig templates
 * @param {RegExp} [options.twigPattern=/\.twig$/] - Pattern to match Twig files
 * @param {string} [options.vueDir='./assets/js'] - Directory containing Vue components
 * @param {RegExp} [options.vuePattern=/\.vue$/] - Pattern to match Vue files
 * @param {string} [options.cssDir='./public/assets'] - Directory containing CSS files
 * @param {RegExp} [options.cssPattern=/\.css$/] - Pattern to match CSS files
 * @param {RegExp[]} [options.ignoredClassPatterns=[/^js-/]] - Patterns for classes to ignore
 * @param {string} [options.classesFromCssFileName='all_classes_from_css.json'] - Output filename for CSS classes
 * @param {string} [options.classesFromCssFlattenedFileName='all_classes_from_css_flattened.json'] - Output filename for flattened CSS classes
 * @param {string} [options.classesFromTemplatesFileName='all_classes_from_vue_and_twig.json'] - Output filename for template classes
 * @param {string} [options.classesFromTemplatesFlattenedFileName='all_classes_from_vue_and_twig_flattened.json'] - Output filename for flattened template classes
 * @param {string} [options.outputFile='unused_css_classes_report.json'] - Output filename for the final report
 * @param {boolean} [options.isDebug=false] - Enable debug logging
 * @param {boolean} [options.showHelperInfos=false] - Show additional helper information
 */
export function twigUnusedCssFinder(options: Partial<TwigUnusedCssFinderOptions> = {}): void {
  initFn(options);
}
