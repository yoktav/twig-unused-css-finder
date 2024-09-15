export const UNCSS_TEMP_DIR = './uncss-stats';
export const TWIG_BASE_DIR = './templates';
export const TWIG_PATTERN = /\.twig$/;
export const VUE_BASE_DIR = './assets/js';
export const VUE_PATTERN = /\.vue$/;
export const CSS_BASE_DIR = './public/assets';
export const CSS_PATTERN = /\.css$/;
export const IGNORED_CLASS_PATTERNS: RegExp[] = [
  /^leaflet-/,
  /^lvml/,
  /^ymaps-/,
  /^svg-/,
  /^glide__/,
  /^glide--/,
  /^icon-/,
  /^js-/,
];
export const CLASSES_FROM_CSS_FILE_NAME = 'all_classes_from_css.json';
export const CLASSES_FROM_CSS_FLATTENED_FILE_NAME = 'all_classes_from_css_flattened.json';
export const CLASSES_FROM_TEMPLATES_FILE_NAME = 'all_classes_from_vue_and_twig.json';
export const CLASSES_FROM_TEMPLATES_FLATTENED_FILE_NAME = 'all_classes_from_vue_and_twig_flattened.json';
export const UNUSED_CSS_CLASSES_REPORT_FILE_NAME = 'unused_css_classes_report.json';
export const IS_DEBUG = false;
