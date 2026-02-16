import {ICompilerContext} from '../types';

/**
 * Resolves physical paths and handles parent-child relationships,
 * including support for deep paths and legacy slot notation.
 */
export const pathResolutionPlugin = (ctx: ICompilerContext) => {
  const uiEntitiesMap = new Map<string, any>();

  // Clone entities for processing and filter out non-UI entities (like State)
  ctx.entities.forEach((v, k) => {
    if (v.type !== 'State') {
      uiEntitiesMap.set(k, {
        ...v,
        id: v.id || k,
        props: v.props ? {...v.props} : {},
        children: v.children ? [...v.children] : []
      });
    }
  });

  const idToPath = new Map<string, string>();
  const getCalculatedPath = (id: string): string => {
    if (idToPath.has(id)) return idToPath.get(id)!;
    const entity = uiEntitiesMap.get(id);
    if (!entity) return id;

    const parentVal = entity.parent;
    const parentId = (typeof parentVal === 'string' && parentVal.includes('.'))
      ? (parentVal.startsWith('[slot]') ? parentVal.split('.').slice(0, -1).join('.').split('.').pop()! : parentVal.split('.').pop()!)
      : parentVal;

    const path = (parentId && parentId !== 'root' && uiEntitiesMap.has(parentId))
      ? `${getCalculatedPath(parentId)}.${id}`
      : id;

    idToPath.set(id, path);
    return path;
  };

  const pathToId = new Map<string, string>();
  uiEntitiesMap.forEach((_, id) => {
    pathToId.set(getCalculatedPath(id), id);
  });

  // Resolve Parent references
  uiEntitiesMap.forEach((node) => {
    const parentVal = node.parent;
    if (typeof parentVal !== 'string') return;

    if (parentVal.startsWith('[slot]')) {
      const content = parentVal.slice(6);
      const segments = content.split('.');
      const slotName = segments.pop()!;
      const parentPath = segments.join('.');

      node.parent = pathToId.get(parentPath) || segments[segments.length - 1];
      (node as any).__jsomp_slot = slotName;
    } else if (parentVal.includes('.')) {
      node.parent = pathToId.get(parentVal) || parentVal.split('.').pop();
    }
  });

  // Populate context nodes for the next stage
  uiEntitiesMap.forEach((node, id) => {
    ctx.nodes.set(id, node);
  });
};
