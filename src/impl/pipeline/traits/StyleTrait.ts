import {IJsompNode, PipelineContext, TraitProcessor, VisualDescriptor} from "@/types";

/**
 * Standard Style Trait
 * Merges style_presets, style_tw, and style_css into descriptor.
 */
export const styleTrait: TraitProcessor = (
  node: IJsompNode,
  descriptor: VisualDescriptor,
  context: PipelineContext
) => {
  const styles: Record<string, any> = {...descriptor.styles};
  const classNames: string[] = [];

  // 1. Handle Presets
  if (node.style_presets && context.stylePresets) {
    for (const preset of node.style_presets) {
      const presetValue = context.stylePresets[preset];
      if (Array.isArray(presetValue)) {
        classNames.push(...presetValue);
      } else if (typeof presetValue === 'string') {
        classNames.push(presetValue);
      }
    }
  }

  // 2. Handle Tailwind (style_tw)
  if (node.style_tw && Array.isArray(node.style_tw)) {
    classNames.push(...node.style_tw);
  }

  // 3. Handle Inline CSS (style_css)
  if (node.style_css) {
    Object.assign(styles, node.style_css);
  }

  descriptor.styles = styles;

  if (classNames.length > 0) {
    const existing = descriptor.props.className;
    descriptor.props.className = existing
      ? `${existing} ${classNames.join(' ')}`
      : classNames.join(' ');
  }
};