import {HtmlRegistry} from './html/HtmlRegistry';
import {BasicRegistry} from './basic/BasicRegistry';

// Re-export specific registries
export {HtmlRegistry, BasicRegistry};

/**
 * Default presets available in JSOMP.
 */
export const presets = {
  html: HtmlRegistry,
  basic: BasicRegistry
};
