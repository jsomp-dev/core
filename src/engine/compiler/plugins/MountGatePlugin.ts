import {ICompilerContext, IJsompPluginDef, PipelineStage} from "../../../types";
import {BindingResolver} from "../../../state";

const _prevAllSuppressed = new Set<string>();

function buildParentIndex(entities: Map<string, any>): Map<string, string[]> {
  const idx = new Map<string, string[]>();
  for (const [id, entity] of entities.entries()) {
    if (!entity) continue;
    const p = entity.parent;
    if (typeof p === 'string') {
      if (!idx.has(p)) idx.set(p, []);
      idx.get(p)!.push(id);
    } else if (Array.isArray(p)) {
      p.forEach(pid => {
        if (!idx.has(pid)) idx.set(pid, []);
        idx.get(pid)!.push(id);
      });
    }
  }
  return idx;
}

function collectDescendants(id: string, parentIdx: Map<string, string[]>, collected: Set<string>) {
  if (collected.has(id)) return;
  collected.add(id);
  const children = parentIdx.get(id);
  if (children) {
    for (const childId of children) {
      collectDescendants(childId, parentIdx, collected);
    }
  }
}

/**
 * Resolve the effective boolean value of the `mounted` field, with Mustache binding support.
 * Also registers reactive dependency tracking on the atomRegistry.
 */
function resolveMountedValue(id: string, entity: any, ctx: ICompilerContext): boolean {
  const raw = entity.mounted;

  if (raw === false || raw === undefined || raw === null) {
    return raw !== false;
  }

  if (typeof raw === 'boolean') {
    return raw;
  }

  if (typeof raw === 'string' && raw.includes('{{') && ctx.atomRegistry) {
    const deps = BindingResolver.extractKeys(raw);
    deps.forEach(key => ctx.onDependency?.(id, key));
    const resolved = BindingResolver.resolve(raw, ctx.atomRegistry);
    return resolved !== false;
  }

  return true;
}

/**
 * MountGatePlugin
 *
 * Controls whether a node participates in the render tree based on the `mounted` field.
 * Supports Mustache bindings (e.g. `mounted: "{{isVisible}}"`) with automatic atom dependency tracking.
 *
 * Behavior:
 * 1. `mounted === false || bound expression resolves to false` → node and its subtree are suppressed (unmounted).
 * 2. Cross-cycle persistence detects "previously suppressed → now visible" transitions,
 *    automatically restoring the entire subtree when a parent node recovers from mounted:false.
 * 3. Sets `hasStructureChanged` to trigger topology reconstruction.
 *
 * @stage PreProcess (Global Handler)
 */
export const mountGatePlugin: IJsompPluginDef = {
  id: 'standard-mount-gate',
  stage: PipelineStage.PreProcess,
  name: 'StandardMountGate',

  handler: (ctx: ICompilerContext) => {
    const parentIdx = buildParentIndex(ctx.entities as Map<string, any>);

    const targetIds = ctx.dirtyIds
      ? Array.from(ctx.dirtyIds)
      : Array.from(ctx.entities.keys());

    const unmountedRoots: string[] = [];
    for (const id of targetIds) {
      const entity = ctx.entities.get(id);
      if (!entity) continue;
      if (!resolveMountedValue(id, entity, ctx)) {
        unmountedRoots.push(id);
      }
    }

    const allSuppressed = new Set<string>();
    for (const id of unmountedRoots) {
      collectDescendants(id, parentIdx, allSuppressed);
    }

    const result = new Map<string, any>();
    let hasChanges = false;

    for (const id of allSuppressed) {
      result.set(id, null);
      hasChanges = true;
    }

    const restored: string[] = [];
    for (const id of _prevAllSuppressed) {
      if (!allSuppressed.has(id)) {
        result.set(id, ctx.entities.get(id) ?? null);
        hasChanges = true;
        restored.push(id);
      }
    }

    _prevAllSuppressed.clear();
    for (const id of allSuppressed) {
      _prevAllSuppressed.add(id);
    }

    if (hasChanges) {
      ctx.hasStructureChanged = true;
    }

    return result;
  }
};
