import {IJsompNode, IJsompRenderContext} from '../../types';

/**
 * Style Resolver
 * Responsible for merging multiple style definitions.
 */
export class StyleResolver {
  /**
   * Resolve final styles and class names of the node.
   */
  public static resolve(node: IJsompNode, context?: IJsompRenderContext) {
    const classNames: string[] = [];

    // 1. Handle presets
    if (node.style_presets && node.style_presets.length > 0) {
      node.style_presets.forEach(presetName => {
        // If the preset mapping is defined in context, expand it.
        if (context?.stylePresets?.[presetName]) {
          classNames.push(...context.stylePresets[presetName]);
        } else {
          // Otherwise keep as is (as a global CSS class)
          classNames.push(presetName);
        }
      });
    }

    // 2. Handle Tailwind
    if (node.style_tw) {
      classNames.push(...node.style_tw);
    }

    // 3. Handle inline styles
    const inlineStyles = node.style_css || {};

    return {
      className: classNames.join(' '),
      style: inlineStyles
    };
  }
}
