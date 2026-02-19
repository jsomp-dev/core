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
  const visited = new Set<string>();

  /**
   * Recursively process style presets (Prefabs)
   */
  const processPreset = (name: string) => {
    if (visited.has(name)) return;
    visited.add(name);

    const value = context.stylePresets?.[name];
    if (!value) return;

    if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string' && context.stylePresets?.[item]) {
          processPreset(item);
        } else {
          classNames.push(item);
        }
      }
    } else if (typeof value === 'string') {
      if (context.stylePresets?.[value]) {
        processPreset(value);
      } else {
        classNames.push(value);
      }
    } else if (typeof value === 'object') {
      // Support object-based prefabs (tw classes + inline styles)
      if (value.tw) {
        for (const tw of value.tw) {
          if (context.stylePresets?.[tw]) {
            processPreset(tw);
          } else {
            classNames.push(tw);
          }
        }
      }
      if (value.css) {
        Object.assign(styles, value.css);
      }
    }
  };

  // 1. Handle Presets
  if (node.style_presets && context.stylePresets) {
    for (const preset of node.style_presets) {
      processPreset(preset);
    }
  }

  // 2. Handle Tailwind (style_tw)
  if (node.style_tw && Array.isArray(node.style_tw)) {
    classNames.push(...node.style_tw);
  }

  // 3. Resolve all Class Names (including bindings)
  const resolvedClassNames: string[] = [];
  if (classNames.length > 0) {
    const resolved = BindingResolver.resolve(classNames, context.registry);
    if (Array.isArray(resolved)) {
      resolved.forEach(item => {
        if (Array.isArray(item)) {
          resolvedClassNames.push(...item.filter(Boolean));
        } else if (item) {
          resolvedClassNames.push(item);
        }
      });
    }
  }

  // 4. Handle Inline CSS (style_css)
  if (node.style_css) {
    Object.assign(styles, node.style_css);
  }

  // 5. Resolve all Styles (including bindings)
  descriptor.styles = BindingResolver.resolve(styles, context.registry);

  // 6. Apply to Descriptor
  if (resolvedClassNames.length > 0) {
    const existing = descriptor.props.className;
    descriptor.props.className = existing
      ? `${existing} ${resolvedClassNames.join(' ')}`
      : resolvedClassNames.join(' ');
  }
};