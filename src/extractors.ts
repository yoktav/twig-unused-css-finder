import { isValidClassName } from './utils';

/**
 * Represents a set of CSS class names
 */
type ClassSet = Set<string>;

/**
 * Function type for extracting classes from content
 */
type ClassExtractor = (content: string, classes: ClassSet) => void;

/**
 * Function type for processing class strings
 */
type ClassProcessor = (classString: string, classes: ClassSet) => void;

/**
 * Options for class extraction
 */
interface ExtractOptions {
  /**
   * Specifies whether to extract classes or selectors
   * @default 'classes'
   */
  extractOnly?: 'classes' | 'selectors';
}

/**
 * Extracts CSS classes from a given content string, handling Twig and Vue syntax
 *
 * @param {string} content - The content to extract CSS classes from
 * @returns {string[]} An array of unique CSS classes
 */
export function extractClassesFromTemplate(content: string): string[] {
  const classes: ClassSet = new Set<string>();

  extractStaticClasses(content, classes);
  extractDynamicClasses(content, classes);

  return Array.from(classes);
}

/**
 * Extracts static CSS classes from the content
 *
 * @param {string} content - The content to extract from
 * @param {ClassSet} classes - The set to store extracted classes
 * @returns {void}
 */
function extractStaticClasses(content: string, classes: ClassSet): void {
  const classPattern = /(?<=^|\s)class\s*=\s*(["'])((?:(?!\1).|\n)*)\1/g;
  let match: RegExpExecArray | null;

  while ((match = classPattern.exec(content)) !== null) {
    let classString = match[2];
    classString = processTwigConstructs(classString, classes);
    classString = processInterpolations(classString);
    classString = classString.replace(/\[[\s\S]*?\]/g, ' ');
    addClassesToSet(classString, classes);
  }
}

/**
 * Extracts dynamic CSS classes from the content
 *
 * @param {string} content - The content to extract from
 * @param {ClassSet} classes - The set to store extracted classes
 * @returns {void}
 */
function extractDynamicClasses(content: string, classes: ClassSet): void {
  const dynamicClassPattern = /(?<=^|\s):class\s*=\s*(['"])((?:(?!\1).|\n)*)\1/g;
  let match: RegExpExecArray | null;

  while ((match = dynamicClassPattern.exec(content)) !== null) {
    const classBinding = match[2];
    if (classBinding.startsWith('{') && classBinding.endsWith('}')) {
      processObjectSyntax(classBinding, classes);
    } else if (classBinding.startsWith('[') && classBinding.endsWith(']')) {
      processArraySyntax(classBinding, classes);
    } else {
      processSimpleBinding(classBinding, classes);
    }
  }
}

/**
 * Extracts CSS selectors or classes from a given content string
 *
 * @param {string} content - The CSS content to extract from
 * @param {ExtractOptions} [options={ extractOnly: 'classes' }] - Extraction options
 * @returns {string[]} An array of CSS selectors or classes
 * @throws {Error} If an invalid extractOnly option is provided
 */
export function extractClassesFromCss(content: string, { extractOnly = 'classes' }: ExtractOptions = {}): string[] {
  validateExtractOption(extractOnly);
  content = removeBackgroundImages(content);
  content = removeUrlFunctions(content);

  const pattern = getExtractionPattern(extractOnly);
  const items: Set<string> = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    processMatch(match, extractOnly, items);
  }

  return Array.from(items);
}

/**
 * Validates the extractOnly option
 *
 * @param {string} extractOnly - The option to validate
 * @throws {Error} If the option is invalid
 * @returns {asserts extractOnly is 'classes' | 'selectors'}
 */
function validateExtractOption(extractOnly: string): asserts extractOnly is 'classes' | 'selectors' {
  if (extractOnly !== 'classes' && extractOnly !== 'selectors') {
    throw new Error("Invalid 'extractOnly' option. Must be either 'classes' or 'selectors'.");
  }

  if (extractOnly === 'selectors') {
    console.warn('Warning: Selector extraction may be incomplete or inaccurate. Some selectors might be identified, but full accuracy is not guaranteed.');
  }
}

/**
 * Processes Twig constructs in a class string
 *
 * @param {string} classString - The class string to process
 * @param {ClassSet} classes - The set to store extracted classes
 * @returns {string} The processed class string
 */
function processTwigConstructs(classString: string, classes: ClassSet): string {
  return classString.replace(/{%[\s\S]*?%}/g, (twigConstruct) => {
    const innerClasses = twigConstruct.match(/['"]([^'"]+)['"]/g) || [];
    innerClasses.forEach((cls) => {
      cls.replace(/['"]/g, '').split(/\s+/).forEach((c) => classes.add(c));
    });
    return ' ';
  });
}

/**
 * Processes interpolations in a class string
 *
 * @param {string} classString - The class string to process
 * @returns {string} The processed class string
 */
function processInterpolations(classString: string): string {
  return classString.replace(/{{[\s\S]*?}}/g, (interpolation) => {
    const ternaryMatch = interpolation.match(/\?[^:]+:/) || [];
    if (ternaryMatch.length > 0) {
      const [truthy, falsy] = interpolation.split(':').map((part) => (part.match(/['"]([^'"]+)['"]/g) || [])
        .map((cls) => cls.replace(/['"]/g, ''))
        .join(' '));
      return `${truthy} ${falsy}`;
    }

    const potentialClasses = interpolation.match(/['"]([^'"]+)['"]/g) || [];
    return potentialClasses.map((cls) => cls.replace(/['"]/g, '')).join(' ');
  });
}

/**
 * Adds classes from a class string to a set
 *
 * @param {string} classString - The class string to process
 * @param {ClassSet} classes - The set to store extracted classes
 * @returns {void}
 */
function addClassesToSet(classString: string, classes: ClassSet): void {
  classString.split(/\s+/).forEach((cls) => {
    if (cls.trim()) {
      classes.add(cls.trim());
    }
  });
}

/**
 * Processes object syntax in a class binding
 *
 * @param {string} classBinding - The class binding to process
 * @param {ClassSet} classes - The set to store extracted classes
 * @returns {void}
 */
function processObjectSyntax(classBinding: string, classes: ClassSet): void {
  const classObject = classBinding.slice(1, -1).trim();
  const keyValuePairs = classObject.split(',');
  keyValuePairs.forEach((pair) => {
    const key = pair.split(':')[0].trim();
    if (key && !key.startsWith('[')) {
      classes.add(key.replace(/['":]/g, ''));
    }
  });
}

/**
 * Processes array syntax in a class binding
 *
 * @param {string} classBinding - The class binding to process
 * @param {ClassSet} classes - The set to store extracted classes
 * @returns {void}
 */
function processArraySyntax(classBinding: string, classes: ClassSet): void {
  const classArray = classBinding.slice(1, -1).split(/,(?![^{]*})/);
  classArray.forEach((item) => {
    item = item.trim();

    if ((item.startsWith("'") && item.endsWith("'")) || (item.startsWith('"') && item.endsWith('"'))) {
      classes.add(item.slice(1, -1));
    } else if (item.startsWith('{')) {
      const objectClasses = item.match(/'([^']+)'/g);
      if (objectClasses) {
        objectClasses.forEach((cls) => classes.add(cls.slice(1, -1)));
      }
    }
  });
}

/**
 * Processes a simple class binding
 *
 * @param {string} classBinding - The class binding to process
 * @param {ClassSet} classes - The set to store extracted classes
 * @returns {void}
 */
function processSimpleBinding(classBinding: string, classes: ClassSet): void {
  const possibleClasses = classBinding.match(/['"]([^'"]+)['"]/g);
  if (possibleClasses) {
    possibleClasses.forEach((cls) => {
      classes.add(cls.replace(/['"]/g, '').trim());
    });
  }
}

/**
 * Removes background images from a CSS content string
 *
 * @param {string} content - The CSS content to process
 * @returns {string} The processed CSS content
 */
function removeBackgroundImages(content: string): string {
  return content.replace(/background(-image)?:\s*url\s*\([^)]*\)[^;]*;/g, '');
}

/**
 * Removes url functions from a CSS content string
 *
 * @param {string} content - The CSS content to process
 * @returns {string} The processed CSS content
 */
function removeUrlFunctions(content: string): string {
  return content.replace(/url\s*\([^)]*\)/g, '');
}

/**
 * Gets the extraction pattern based on the extraction type
 *
 * @param {'classes' | 'selectors'} extractOnly - The type of extraction
 * @returns {RegExp} The extraction pattern
 */
function getExtractionPattern(extractOnly: 'classes' | 'selectors'): RegExp {
  return extractOnly === 'classes'
    ? /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g
    : /([^{}]+)(?=\s*\{)/g;
}

/**
 * Processes a regex match based on the extraction type
 *
 * @param {RegExpExecArray} match - The regex match result
 * @param {'classes' | 'selectors'} extractOnly - The type of extraction
 * @param {Set<string>} items - The set to store extracted items
 * @returns {void}
 */
function processMatch(match: RegExpExecArray, extractOnly: 'classes' | 'selectors', items: Set<string>): void {
  if (extractOnly === 'classes') {
    const className = match[1];
    if (isValidClassName(className)) {
      items.add(className);
    }
  } else {
    match[1].split(',').forEach((selector) => {
      const trimmedSelector = selector.trim();
      if (trimmedSelector) {
        items.add(trimmedSelector);
      }
    });
  }
}
