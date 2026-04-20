import {ICompilerContext, IJsompPluginDef, PipelineStage} from '../../../types';

/**
 * MultiMountPlugin
 * Responsibility: Explodes entities with multiple parents into independent node instances.
 * Runs as a Global Handler to inject synthetic entities before batch processing.
 */
export const multiMountPlugin: IJsompPluginDef = {
  id: 'standard-multi-mount',
  stage: PipelineStage.ReStructure,
  handler: (ctx: ICompilerContext) => {
    const syntheticEntities = new Map<string, any>();
    const templatesToSuppress = new Set<string>();

    // 1. Build a quick lookup for children
    const parentToChildren = new Map<string, string[]>();
    for (const [id, entity] of ctx.entities.entries()) {
      if (!entity) continue;
      
      const p = entity.parent;
      if (typeof p === 'string') {
        if (!parentToChildren.has(p)) parentToChildren.set(p, []);
        parentToChildren.get(p)!.push(id);
      }
    }

    // 2. Recursive helper to explode a subtree
    const explode = (id: string, entity: any, resolvedParents: string[]) => {
      if (!entity) return;
      templatesToSuppress.add(id);

      resolvedParents.forEach(pId => {
        const syntheticId = `${pId}.${id}`;
        
        // Create synthetic entity
        const syntheticEntity = {
          ...entity,
          id: syntheticId,
          parent: pId,
          children: [],
          _isSynthetic: true,
          _originalId: id
        };

        syntheticEntities.set(syntheticId, syntheticEntity);
        ctx.nodes.set(syntheticId, syntheticEntity as any);
        if (ctx.createdIds) {
          ctx.createdIds.add(syntheticId);
        }

        // Explode children using the lookup map
        const children = parentToChildren.get(id);
        if (children) {
          children.forEach(childId => {
            const childEntity = ctx.entities.get(childId);
            if (childEntity) {
              explode(childId, childEntity, [syntheticId]);
            }
          });
        }
      });
    };

    // 3. Scan for root explosion points (entities with parent array)
    for (const [id, entity] of ctx.entities.entries()) {
      if (entity && Array.isArray(entity.parent)) {
        explode(id, entity, entity.parent);
      }
    }

    // 4. Cleanup templates
    templatesToSuppress.forEach(id => {
      syntheticEntities.set(id, null);
      ctx.nodes.delete(id);
    });

    if (syntheticEntities.size > 0) {
      ctx.hasStructureChanged = true;
    }

    return syntheticEntities.size > 0 ? syntheticEntities : undefined;
  }
};
