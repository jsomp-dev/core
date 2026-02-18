import {ICompilerContext, IJsompPluginDef, PipelineStage} from '../types';

/**
 * Resolves physical paths and handles parent-child relationships,
 * including support for deep paths and legacy slot notation.
 */
export const pathResolutionPlugin: IJsompPluginDef = {
  id: 'standard-path',
  stage: PipelineStage.ReStructure,
  onNode: (id: string, entity: any, ctx: ICompilerContext) => {
    // 1. Skip non-UI entities
    if (entity.type === 'State') return;

    // 2. Initialize path cache and maps in context if not exists
    if (!ctx.options.__pathCache) {
      ctx.options.__pathCache = new Map<string, string>();
      ctx.options.__pathToId = new Map<string, string>();
    }

    const pathCache = ctx.options.__pathCache as Map<string, string>;
    const pathToIdMap = ctx.options.__pathToId as Map<string, string>;

    // 3. Resolve Parent/Slot references
    const parentVal = entity.parent;
    const explicitSlot = entity.slot;

    /**
     * Recursive path calculator (Memoized)
     */
    const getCalculatedPath = (targetId: string): string => {
      if (pathCache.has(targetId)) return pathCache.get(targetId)!;

      const targetEntity = ctx.entities.get(targetId);
      if (!targetEntity) return targetId;

      const pVal = targetEntity.parent;
      let pId: string | undefined;

      // Standard parent resolution: handle both ID and path.notation
      if (typeof pVal === 'string') {
        pId = pVal.includes('.') ? pVal.split('.').pop()! : pVal;
      }

      const path = (pId && ctx.entities.has(pId))
        ? `${getCalculatedPath(pId)}.${targetId}`
        : targetId;

      pathCache.set(targetId, path);
      pathToIdMap.set(path, targetId);
      return path;
    };

    // calculate current node's path
    const path = getCalculatedPath(id);

    // 4. Create or Update node instance
    const existingNode = ctx.nodes.get(id);
    const node: any = existingNode ? existingNode : {
      id: entity.id || id,
      children: []
    };

    // Sink data from entity
    node.type = entity.type;
    node.props = entity.props ? {...entity.props} : (node.props || {});
    node.style_presets = entity.style_presets;
    node.style_tw = entity.style_tw;
    node.style_css = entity.style_css;
    node.actions = entity.actions;
    node._fullPath = path;

    // Normalize parent ID
    if (typeof parentVal === 'string') {
      if (parentVal.includes('.')) {
        node.parent = pathToIdMap.get(parentVal) || parentVal.split('.').pop();
      } else {
        node.parent = parentVal;
      }
    } else {
      node.parent = parentVal;
    }

    // Explicit slot assignment
    if (explicitSlot) {
      node.slot = explicitSlot;
    }

    ctx.nodes.set(id, node);
  }
};
