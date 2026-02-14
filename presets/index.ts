import {HtmlRegistry} from './html/HtmlRegistry';

// Re-export specific registries
export {HtmlRegistry};

/**
 * Default preset that includes only basic HTML support.
 * This ensures the core library is usable out-of-the-box without extra dependencies.
 */
export const presets = {
  html: HtmlRegistry
};
