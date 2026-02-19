import {IJsompNode, PipelineContext, TraitProcessor, VisualDescriptor} from "../../../types";
import {BindingResolver} from "../../../state";

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
  const rawTw = node.style_tw;
  if (rawTw && Array.isArray(rawTw)) {
    const resolvedTw = BindingResolver.resolve(rawTw, context.registry);
    if (Array.isArray(resolvedTw)) {
      classNames.push(...resolvedTw);
    }
  }

  // 3. Handle Inline CSS (style_css)
  if (node.style_css) {
    const resolvedStyles = BindingResolver.resolve(node.style_css, context.registry);
    Object.assign(styles, resolvedStyles);
  }

  descriptor.styles = styles;

  if (classNames.length > 0) {
    const existing = descriptor.props.className;
    descriptor.props.className = existing
      ? `${existing} ${classNames.join(' ')}`
      : classNames.join(' ');
  }
};