import {ICompilerContext, IJsompPluginDef, PipelineStage} from '../types';

/**
 * Inherit Plugin
 * Implements prototypal inheritance for nodes.
 * 
 * Rules:
 * - type: Sub-node covers parent node (Overlay).
 * - props: Shallow merge, sub-node priority (Shallow Merge).
 * - style_presets: Unique union of arrays (Union).
 * - style_tw: Unique union of arrays (Union).
 * - style_css: Shallow merge, sub-node priority (Shallow Merge).
 * - slot / parent: Ignored (Structure logic is not inherited).
 */
export const inheritPlugin: IJsompPluginDef = {
  id: 'standard-inherit',
  stage: PipelineStage.PreProcess,
  handler: (ctx: ICompilerContext) => {
    const resolved = new Set<string>();

    /**
     * Merge two entities based on JSOMP inheritance rules
     */
    const mergeEntities = (parent: any, child: any) => {
      // Start with a shallow copy of the child to preserve its unique fields (like parent, slot)
      const merged = {...child};

      // 1. type: If child has no type, use parent's
      if (!merged.type && parent.type) {
        merged.type = parent.type;
      }

      // 2. props: Shallow merge
      merged.props = {...(parent.props || {}), ...(child.props || {})};

      // 3. style_css: Shallow merge
      merged.style_css = {...(parent.style_css || {}), ...(child.style_css || {})};

      // 4. style_presets: Union of unique values
      if (parent.style_presets || child.style_presets) {
        const presets = new Set([
          ...(parent.style_presets || []),
          ...(child.style_presets || [])
        ]);
        merged.style_presets = Array.from(presets);
      }

      // 5. style_tw: Union of unique values
      if (parent.style_tw || child.style_tw) {
        const tw = new Set([
          ...(parent.style_tw || []),
          ...(child.style_tw || [])
        ]);
        merged.style_tw = Array.from(tw);
      }

      // 6. actions: Deep merge (Map tag to union of events)
      if (parent.actions || child.actions) {
        const actions = {...(parent.actions || {})};
        Object.entries(child.actions || {}).forEach(([tag, events]) => {
          const combinedEvents = new Set([
            ...(actions[tag] || []),
            ...(events as string[] || [])
          ]);
          actions[tag] = Array.from(combinedEvents);
        });
        merged.actions = actions;
      }

      return merged;
    };

    /**
     * Recursive resolver with cycle detection and memoization
     */
    const resolve = (id: string, visited: Set<string>): any => {
      // Return cached result if already processed
      if (resolved.has(id)) return ctx.entities.get(id);

      const entity = ctx.entities.get(id);
      if (!entity || !entity.inherit) {
        resolved.add(id);
        return entity;
      }

      // Cycle detection
      if (visited.has(id)) {
        ctx.logger.throw('CORE_INHERIT_CIRCULAR', `Circular inheritance chain detected at node: ${id}`);
      }
      visited.add(id);

      const parentId = entity.inherit;
      const parent = resolve(parentId, visited);

      if (!parent) {
        ctx.logger.warn(`[Inherit] Node ${id} refers to missing base node: ${parentId}`);
        resolved.add(id);
        return entity;
      }

      // Merge and cleanup
      const merged = mergeEntities(parent, entity);
      delete merged.inherit; // Prevents re-triggering and keeps output clean

      ctx.entities.set(id, merged);
      resolved.add(id);
      return merged;
    };

    // Process all entities
    ctx.entities.forEach((_, id) => {
      resolve(id, new Set());
    });
  }
};
