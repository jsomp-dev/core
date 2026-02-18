import {IJsompPluginDef, PipelineStage} from '../types';
import {BindingResolver} from '../../core/BindingResolver';

/**
 * Attribute Cache Plugin
 * Caches mustache resolution results to avoid redundant regex parsing and lookups.
 * 
 * Performance Note: 
 * Ensures that in AI streaming scenarios, only changed text segments trigger regex parsing.
 */
const propCache = new WeakMap<any, Map<string, {
  checksum: string,
  value: any
}>>();

export const attributeCachePlugin: IJsompPluginDef = {
  id: 'standard-attribute-cache',
  stage: PipelineStage.PreProcess, // We want to resolve attributes early so other plugins see resolved values
  onNode: (id, entity, ctx) => {
    if (!entity.props || !ctx.atomRegistry) return;

    let entityCache = propCache.get(entity);
    if (!entityCache) {
      entityCache = new Map();
      propCache.set(entity, entityCache);
    }

    const updates: Record<string, any> = {};
    let changed = false;

    for (const [key, value] of Object.entries(entity.props)) {
      if (typeof value === 'string' && value.includes('{{')) {
        const depKeys = BindingResolver.extractKeys(value);
        if (depKeys.length === 0) continue;

        // Calculate checksum based on atom values
        const checksum = depKeys.map(k => {
          const atom = ctx.atomRegistry!.get(k);
          // Simple stringification of atom value for checksum
          const atomVal = (atom && typeof atom === 'object' && 'value' in atom) ? atom.value : atom;
          return `${k}:${atomVal}`;
        }).join('|');

        const cached = entityCache.get(key);
        if (cached && cached.checksum === checksum) {
          updates[key] = cached.value;
          continue;
        }

        // Parse and cache
        const resolved = BindingResolver.resolve(value, ctx.atomRegistry!);
        entityCache.set(key, {checksum, value: resolved});
        updates[key] = resolved;
        changed = true;
      }
    }

    if (changed) {
      // Return the updated props to be merged by the framework
      return {
        props: {
          ...entity.props,
          ...updates
        }
      };
    }
  }
};
