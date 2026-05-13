import {ICompilerContext, IJsompPluginDef, PipelineStage} from "../../../types";

export const pullPlugin: IJsompPluginDef = {
  id: 'standard-pull',
  stage: PipelineStage.PreProcess,
  handler: (ctx: ICompilerContext) => {
    const syntheticEntities = new Map<string, any>();
    const pullNodes: [string, any][] = [];

    for (const [id, entity] of ctx.entities.entries()) {
      if (entity && entity.pull) {
        pullNodes.push([id, entity]);
      }
    }

    if (pullNodes.length === 0) return;
    if (!ctx.entityPool) {
      ctx.logger.warn('[PullPlugin] No entity pool available, skipping pull resolution');
      return;
    }

    const pool = ctx.entityPool;
    const allPoolNodes = pool.all();

    const isPoolInternalRef = (id: string, namespace?: string): boolean => {
      if (allPoolNodes.has(id)) return true;
      if (namespace && allPoolNodes.has(`${namespace}.${id}`)) return true;
      return false;
    };

    const collectSubtree = (rootFullId: string, visited: Set<string>): Map<string, any> => {
      if (visited.has(rootFullId)) {
        ctx.logger.warn(`[PullPlugin] Circular reference detected: "${rootFullId}"`);
        return new Map();
      }
      visited.add(rootFullId);

      const result = new Map<string, any>();
      const rootNode = pool.get(rootFullId);
      if (!rootNode) return result;

      result.set(rootFullId, {...rootNode, _isRoot: true});

      const collectChildren = (parentId: string) => {
        const children = pool.getChildren(parentId);
        for (const child of children) {
          if (visited.has(child.id)) {
            ctx.logger.warn(`[PullPlugin] Circular reference detected: "${child.id}"`);
            continue;
          }
          visited.add(child.id);
          result.set(child.id, {...child});
          collectChildren(child.id);
        }
      };

      collectChildren(rootFullId);

      return result;
    };

    const resolvePoolRoots = (pullValue: string): string[] => {
      const isNamespace = !pullValue.includes('.');

      if (isNamespace) {
        const nsPrefix = pullValue + '.';
        const roots: string[] = [];

        for (const [fullId, node] of allPoolNodes) {
          if (!fullId.startsWith(nsPrefix)) continue;
          const parent = node.parent;
          if (!parent) {
            roots.push(fullId);
          } else {
            const parentIds = Array.isArray(parent) ? parent : [parent];
            const hasParentInPool = parentIds.some(p =>
              allPoolNodes.has(p) || allPoolNodes.has(`${pullValue}.${p}`)
            );
            if (!hasParentInPool) {
              roots.push(fullId);
            }
          }
        }
        return roots;
      }

      if (!pool.get(pullValue)) {
        ctx.logger.throw('PULL_REFERENCE_ERROR', `[PullPlugin] Node references non-existent pool entity: "${pullValue}"`);
      }
      return [pullValue];
    };

    for (const [pullNodeId, pullEntity] of pullNodes) {
      const pullValue = pullEntity.pull;
      const poolRootIds = resolvePoolRoots(pullValue);

      if (poolRootIds.length === 0) {
        ctx.logger.warn(`[PullPlugin] No pool roots found for: "${pullValue}"`);
        continue;
      }

      const pullNodeParent = pullEntity.parent;
      const isMultiParent = Array.isArray(pullNodeParent);
      const resolvedParents = !pullNodeParent
        ? [null]
        : isMultiParent
          ? pullNodeParent
          : [pullNodeParent];

      for (const parentId of resolvedParents) {
        const visited = new Set<string>();

        for (const rootFullId of poolRootIds) {
          const subtree = collectSubtree(rootFullId, visited);
          if (subtree.size === 0) continue;

          const prefix = isMultiParent && parentId
            ? `${parentId}.${pullNodeId}`
            : pullNodeId;

          for (const [origId, entity] of subtree) {
            const syntheticId = `${prefix}.${origId}`;

            const syntheticEntity: any = {
              ...entity,
              id: syntheticId,
              _isSynthetic: true,
              _originalId: origId,
              _sourcePull: pullNodeId,
            };

            if (entity._isRoot) {
              syntheticEntity.parent = parentId;
            } else if (entity.parent) {
              const origParent = entity.parent;
              const ns = origId.includes('.') ? origId.split('.')[0] : undefined;
              if (typeof origParent === 'string') {
                const isInternal = isPoolInternalRef(origParent, ns);
                syntheticEntity.parent = isInternal
                  ? `${prefix}.${origParent}`
                  : origParent;
              } else if (Array.isArray(origParent)) {
                syntheticEntity.parent = origParent.map(p =>
                  isPoolInternalRef(p, ns) ? `${prefix}.${p}` : p
                );
              }
            }

            delete syntheticEntity._isRoot;
            syntheticEntities.set(syntheticId, syntheticEntity);
          }
        }
      }

      syntheticEntities.set(pullNodeId, null);
    }

    if (syntheticEntities.size > 0) {
      ctx.hasStructureChanged = true;
      for (const [id, val] of syntheticEntities) {
        if (val !== null) {
          ctx.createdIds?.add(id);
        }
      }
    }

    return syntheticEntities;
  }
};