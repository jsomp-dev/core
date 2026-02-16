import {ICompilerContext} from '../types';

/**
 * Resolves physical paths and handles parent-child relationships,
 * including support for deep paths and legacy slot notation.
 */
export const pathResolutionPlugin = {
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

    /**
     * Recursive path calculator (Memoized)
     */
    const getCalculatedPath = (targetId: string): string => {
      if (pathCache.has(targetId)) return pathCache.get(targetId)!;

      const targetEntity = ctx.entities.get(targetId);
      if (!targetEntity) return targetId;

      const parentVal = targetEntity.parent;
      // Resolve basic parent ID from string or slot notation
      let parentId: string | undefined;

      if (typeof parentVal === 'string') {
        if (parentVal.includes('.')) {
          parentId = parentVal.startsWith('[slot]')
            ? parentVal.split('.').slice(0, -1).join('.').split('.').pop()!
            : parentVal.split('.').pop()!;
        } else {
          parentId = parentVal;
        }
      }

      const path = (parentId && parentId !== 'root' && ctx.entities.has(parentId))
        ? `${getCalculatedPath(parentId)}.${targetId}`
        : targetId;

      pathCache.set(targetId, path);
      pathToIdMap.set(path, targetId);
      return path;
    };

    // calculate current node's path
    const path = getCalculatedPath(id);

    // 3. Create node instance
    const node = {
      ...entity,
      id: entity.id || id,
      props: entity.props ? {...entity.props} : {},
      children: entity.children ? [...entity.children] : [],
      _fullPath: path
    };

    // 4. Resolve Parent/Slot references
    const parentVal = node.parent;
    if (typeof parentVal === 'string') {
      if (parentVal.startsWith('[slot]')) {
        const content = parentVal.slice(6);
        const segments = content.split('.');
        const slotName = segments.pop()!;
        const parentPath = segments.join('.');

        // Ensure parent path is also calculated
        const pId = pathToIdMap.get(parentPath) || segments[segments.length - 1];
        node.parent = pId;
        (node as any).__jsomp_slot = slotName;
      } else if (parentVal.includes('.')) {
        const pId = pathToIdMap.get(parentVal) || parentVal.split('.').pop();
        node.parent = pId;
      }
    }

    ctx.nodes.set(id, node);
  }
};
