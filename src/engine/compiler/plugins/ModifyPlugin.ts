import {ICompilerContext, IJsompModify, IJsompPluginDef, PipelineStage} from "../../../types";
import {BindingResolver} from "../../../state";
import {pathUtils} from "../../../utils/path";

const DANGEROUS_FIELDS = new Set([
  'id',
  'type',
  'parent',
  'inherit',
  'pull',
  'modify',
  '_fullPath',
  '_isSynthetic',
  '_originalId',
  '_sourcePull',
]);

const META_FIELDS = new Set([
  'id',
  'modify',
  '_isSynthetic',
  '_originalId',
  '_sourcePull',
]);

function isPlainObject(val: any): val is Record<string, any> {
  return val !== null && typeof val === 'object' && !Array.isArray(val);
}

function resolveTarget(
  targetPath: string,
  modifyNodeId: string,
  entities: ReadonlyMap<string, any>
): string | null {
  const pathStack: string[] = [];
  let currentId: string | null = modifyNodeId;
  while (currentId) {
    pathStack.unshift(currentId);
    const entity = entities.get(currentId);
    if (!entity) break;
    currentId = entity.parent || null;
    if (Array.isArray(currentId)) {
      currentId = currentId[0] || null;
    }
  }

  const source = {get: (p: string) => entities.get(p)};
  const resolved = pathUtils.resolveWithBacktracking(targetPath, pathStack, source);

  return entities.has(resolved) ? resolved : null;
}

function feedMerge(target: any, source: any, allowedDangerous: Set<string>): any {
  const result: any = Array.isArray(target) ? [...target] : {...target};

  for (const key of Object.keys(source)) {
    if (META_FIELDS.has(key)) continue;
    if (DANGEROUS_FIELDS.has(key) && !allowedDangerous.has(key)) continue;

    const srcVal = source[key];
    const tgtVal = target[key];

    if (key === 'actions' && isPlainObject(tgtVal) && isPlainObject(srcVal)) {
      const merged: Record<string, string[]> = {...tgtVal};
      for (const [actionTag, events] of Object.entries(srcVal)) {
        const existing = merged[actionTag] || [];
        const union = new Set([...existing, ...(events as string[])]);
        merged[actionTag] = Array.from(union);
      }
      result[key] = merged;
    } else if (isPlainObject(tgtVal) && isPlainObject(srcVal)) {
      result[key] = {...tgtVal, ...srcVal};
    } else if (Array.isArray(tgtVal) && Array.isArray(srcVal)) {
      const union = new Set([...tgtVal, ...srcVal]);
      result[key] = Array.from(union);
    } else if (srcVal !== undefined) {
      result[key] = srcVal;
    }
  }

  return result;
}

function overrideMerge(target: any, source: any, allowedDangerous: Set<string>): any {
  const result: any = {...target};

  for (const key of Object.keys(source)) {
    if (META_FIELDS.has(key)) continue;
    if (DANGEROUS_FIELDS.has(key) && !allowedDangerous.has(key)) continue;

    if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }

  return result;
}

function replaceMerge(target: any, source: any, allowedDangerous: Set<string>): any {
  const result: any = {};

  for (const key of Object.keys(source)) {
    if (META_FIELDS.has(key)) continue;
    if (DANGEROUS_FIELDS.has(key) && !allowedDangerous.has(key)) continue;

    if (source[key] !== undefined) {
      result[key] = source[key];
    }
  }

  result.id = target.id;

  return result;
}

export const modifyPlugin: IJsompPluginDef = {
  id: 'standard-modify',
  stage: PipelineStage.PreProcess,
  handler: (ctx: ICompilerContext) => {
    const modifyNodes: [string, any][] = [];

    for (const [id, entity] of ctx.entities.entries()) {
      if (entity && entity.modify) {
        modifyNodes.push([id, entity]);
      }
    }

    if (modifyNodes.length === 0) return;

    // Build a merged entity view that includes pending updates from earlier plugins (e.g. PullPlugin)
    const mergedEntities = new Map(ctx.entities);
    if (ctx.entityUpdates) {
      for (const [id, val] of ctx.entityUpdates) {
        if (val === null) {
          mergedEntities.delete(id);
        } else {
          mergedEntities.set(id, {...mergedEntities.get(id), ...val});
        }
      }
    }

    const updates = new Map<string, any>();

    for (const [modifyNodeId, modifyEntity] of modifyNodes) {
      const modifyDirective: IJsompModify = modifyEntity.modify;
      let {target: rawTarget, mode, allowDangerousFields} = modifyDirective;

      if (ctx.atomRegistry) {
        if (typeof rawTarget === 'string' && rawTarget.includes('{{')) {
          BindingResolver.extractKeys(rawTarget).forEach(k => ctx.onDependency?.(modifyNodeId, k));
          rawTarget = BindingResolver.resolve(rawTarget, ctx.atomRegistry);
        }
        if (typeof mode === 'string' && mode.includes('{{')) {
          BindingResolver.extractKeys(mode).forEach(k => ctx.onDependency?.(modifyNodeId, k));
          mode = BindingResolver.resolve(mode, ctx.atomRegistry);
        }
      }

      const resolvedTargetId = resolveTarget(rawTarget, modifyNodeId, mergedEntities);
      if (!resolvedTargetId) {
        ctx.logger.warn(`[ModifyPlugin] Could not resolve target "${rawTarget}" from node "${modifyNodeId}"`);
        continue;
      }

      const targetEntity = mergedEntities.get(resolvedTargetId);
      if (!targetEntity) {
        ctx.logger.warn(`[ModifyPlugin] Target node "${resolvedTargetId}" not found for modify from "${modifyNodeId}"`);
        continue;
      }

      const allowedDangerous = new Set(allowDangerousFields || []);

      let merged: any;
      switch (mode) {
        case 'feed':
          merged = feedMerge(targetEntity, modifyEntity, allowedDangerous);
          break;
        case 'override':
          merged = overrideMerge(targetEntity, modifyEntity, allowedDangerous);
          break;
        case 'replace':
          merged = replaceMerge(targetEntity, modifyEntity, allowedDangerous);
          break;
        default:
          ctx.logger.warn(`[ModifyPlugin] Unknown mode "${mode}" on node "${modifyNodeId}"`);
          continue;
      }

      updates.set(resolvedTargetId, merged);
      updates.set(modifyNodeId, null);
    }

    if (updates.size > 0) {
      ctx.hasStructureChanged = true;
    }

    return updates;
  }
};