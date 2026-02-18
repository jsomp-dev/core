
import {IJsompNode, VisualDescriptor, PipelineContext, TraitProcessor} from '../../types';

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

/**
 * Standard Content Trait (Mustache)
 * Resolves content using context.resolver and caching.
 * Implements "Mustache Cache" strategy: Key = NodeID + AtomVersion
 */
export const contentTrait: TraitProcessor = (
  node: IJsompNode,
  descriptor: VisualDescriptor,
  context: PipelineContext
) => {
  const rawContent = node.props && node.props.content;

  // If no content, do nothing
  if (!rawContent || typeof rawContent !== 'string') {
    return;
  }

  // If no resolver, pass raw content
  if (!context.resolver) {
    descriptor.props.content = rawContent;
    return;
  }

  // --- Cache Logic ---
  // Try to use trait-level cache from context
  let traitCache = context.cache.get('ContentTrait');
  if (!traitCache) {
    traitCache = new Map<string, any>();
    context.cache.set('ContentTrait', traitCache);
  }

  // Versioning Strategy
  // Use node ID version if available (registry.version(node.id))
  // Fallback to 0 if versioning is not supported
  const version = context.registry.version ? context.registry.version(node.id) : 0;

  // Cache Key: NodeID + Version
  const cacheKey = `${node.id}:${version}`;

  if (traitCache.has(cacheKey)) {
    descriptor.props.content = traitCache.get(cacheKey);
    return;
  }

  // Cache miss - Resolve
  // We pass nodeId to resolve() so it can potentially track dependencies or use context
  const resolved = context.resolver.resolve(rawContent, {nodeId: node.id});

  traitCache.set(cacheKey, resolved);
  descriptor.props.content = resolved;
};

/**
 * Standard Slot Trait
 * Groups children into descriptor.slots.
 */
export const slotTrait: TraitProcessor = (
  node: IJsompNode,
  descriptor: VisualDescriptor,
  context: PipelineContext
) => {
  // Use 'any' cast to access children as they are not on IJsompNode interface
  const children = (node as any).children as IJsompNode[];

  if (children && Array.isArray(children)) {
    for (const child of children) {
      const slotName = child.slot || 'default';

      if (!descriptor.slots[slotName]) {
        descriptor.slots[slotName] = [];
      }

      descriptor.slots[slotName].push(child.id);
    }
  }
};
