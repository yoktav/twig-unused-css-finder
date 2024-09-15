import { isValidClassName } from './utils';

/**
 * Extracts CSS classes from a given content string, handling Twig and Vue syntax
 *
 * @param content - The content to extract CSS classes from
 * @returns An array of CSS classes
 */
export function extractClassesFromTemplate(content: string): string[] {
  const classPattern = /(?<=^|\s)class\s*=\s*(["'])((?:(?!\1).|\n)*)\1/g;
  const dynamicClassPattern = /(?<=^|\s):class\s*=\s*(['"])((?:(?!\1).|\n)*)\1/g;
  const classes = new Set<string>();
  let match: RegExpExecArray | null;

  // For class=""
  while ((match = classPattern.exec(content)) !== null) {
    let classString = match[2];

    // Extract classes from Twig constructs
    classString = classString.replace(/{%[\s\S]*?%}/g, (twigConstruct) => {
      const innerClasses = twigConstruct.match(/['"]([^'"]+)['"]/g) || [];
      innerClasses.forEach((cls) => {
        cls.replace(/['"]/g, '').split(/\s+/).forEach((c) => classes.add(c));
      });
      return ' ';
    });

    // Extract potential classes from Vue/Twig interpolations
    classString = classString.replace(/{{[\s\S]*?}}/g, (interpolation) => {
      // Handle ternary operators
      const ternaryMatch = interpolation.match(/\?[^:]+:/) || [];
      if (ternaryMatch.length > 0) {
        const [truthy, falsy] = interpolation.split(':').map((part) => (part.match(/['"]([^'"]+)['"]/g) || [])
          .map((cls) => cls.replace(/['"]/g, ''))
          .join(' '));
        return `${truthy} ${falsy}`;
      }

      // Handle non-ternary cases
      const potentialClasses = interpolation.match(/['"]([^'"]+)['"]/g) || [];
      return potentialClasses.map((cls) => cls.replace(/['"]/g, '')).join(' ');
    });

    // Remove square brackets content
    classString = classString.replace(/\[[\s\S]*?\]/g, ' ');

    // Split remaining classes and add to set
    classString.split(/\s+/).forEach((cls) => {
      if (cls.trim()) {
        classes.add(cls.trim());
      }
    });
  }

  // For :class=""
  while ((match = dynamicClassPattern.exec(content)) !== null) {
    const classBinding = match[2];

    if (classBinding.startsWith('{') && classBinding.endsWith('}')) {
      // Object syntax: { key: value, key2: value2 }
      const classObject = classBinding.slice(1, -1).trim();
      const keyValuePairs = classObject.split(',');
      keyValuePairs.forEach((pair) => {
        const key = pair.split(':')[0].trim();
        if (key && !key.startsWith('[')) {
          classes.add(key.replace(/['":]/g, ''));
        }
      });
    } else if (classBinding.startsWith('[') && classBinding.endsWith(']')) {
      // Array syntax: ['class1', 'class2', { key: value }]
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
    } else {
      // Simple binding or complex expression
      const possibleClasses = classBinding.match(/['"]([^'"]+)['"]/g);
      if (possibleClasses) {
        possibleClasses.forEach((cls) => {
          classes.add(cls.replace(/['"]/g, '').trim());
        });
      }
    }
  }

  return Array.from(classes);
}

interface ExtractOptions {
  extractOnly?: 'classes' | 'selectors';
}

/**
 * Extracts CSS selectors or classes from a given content string
 *
 * @param content - The CSS content to extract from
 * @param options - Extraction options
 * @returns An array of CSS selectors or classes
 * @throws {Error} If an invalid extractOnly option is provided
 */
export function extractClassesFromCss(content: string, { extractOnly = 'classes' }: ExtractOptions = {}): string[] {
  if (extractOnly !== 'classes' && extractOnly !== 'selectors') {
    throw new Error("Invalid 'extractOnly' option. Must be either 'classes' or 'selectors'.");
  }

  // Remove all background-image declarations
  content = content.replace(/background(-image)?:\s*url\s*\([^)]*\)[^;]*;/g, '');

  // Remove all url() functions to catch any remaining cases
  content = content.replace(/url\s*\([^)]*\)/g, '');

  let pattern: RegExp;
  if (extractOnly === 'classes') {
    // This pattern matches class names more accurately
    pattern = /\.(-?[_a-zA-Z]+[_a-zA-Z0-9-]*)/g;
  } else {
    // This regex matches CSS selectors, including complex ones
    pattern = /([^{}]+)(?=\s*\{)/g;
  }

  const items = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content)) !== null) {
    if (extractOnly === 'classes') {
      // Remove the leading dot and filter out invalid class names
      const className = match[1];
      if (isValidClassName(className)) {
        items.add(className);
      }
    } else {
      // Split in case of multiple selectors separated by comma
      match[1].split(',').forEach((selector) => {
        const trimmedSelector = selector.trim();
        if (trimmedSelector) {
          items.add(trimmedSelector);
        }
      });
    }
  }

  return Array.from(items);
}
