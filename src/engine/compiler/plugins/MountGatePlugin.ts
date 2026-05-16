import {ICompilerContext, IJsompPluginDef, PipelineStage} from "../../../types";
import {BindingResolver} from "../../../state";
import {jsompEnv} from "../../../JsompEnv";

/**
 * MountGatePlugin
 * Handles the node's mounted field to control whether nodes participate in the render tree.
 * 
 * Behavior rules:
 * - mounted: true / undefined → normal render
 * - mounted: false → node and all its descendants are removed from the render tree
 * - mounted: "{{atomKey}}" → visibility determined by atom resolution
 * 
 * Core features:
 * 1. Subtree cascade: when a parent is suppressed, all descendants are cascaded
 * 2. Cross-cycle persistence: maintains suppressed state set, triggers topology rebuild on recovery
 * 3. Reactive binding: supports Mustache syntax for dynamic toggling
 * 
 * Execution timing: Hydrate stage, runs after TreeAssemblyPlugin,
 * ensuring the tree structure is assembled before traversing to mark suppressed nodes.
 * 
 * Note: Instead of removing nodes from ctx.result, marks them with _suppressed.
 * Actual visibility control is handled by the visual pipeline's mustacheTrait and the React render layer,
 * supporting reactive switching on atom changes.
 */
export const mountGatePlugin: IJsompPluginDef = {
  id: 'standard-mount-gate',
  stage: PipelineStage.Hydrate,
  handler: (ctx: ICompilerContext) => {
    if (!ctx.result || ctx.result.length === 0) return;

    const atomRegistry = ctx.atomRegistry;

    const resolveMounted = (node: any): boolean => {
      const mounted = node.mounted;
      if (mounted === undefined || mounted === null) return true;

      if (typeof mounted === 'string') {
        if (!atomRegistry) return true;
        const resolved = BindingResolver.resolve(mounted, atomRegistry);
        return resolved !== false;
      }

      if (typeof mounted !== 'boolean') {
        jsompEnv.logger.throw('[MountGatePlugin]', `Invalid mounted value for node ${node.id}: ${mounted}`);
      }

      return mounted;
    };

    const prevSuppressed: Set<string> = ctx.options.__mountGateSuppressed || new Set();
    const currentSuppressed = new Set<string>();
    let hasChanged = false;

    /**
     * Recursively traverse the tree, marking suppressed nodes and their subtrees.
     * When a node's suppression state changes, its ID is added to ctx.dirtyIds,
     * ensuring the visual pipeline re-processes its descriptor.
     */
    const markTree = (nodes: any[], ancestorSuppressed: boolean): void => {
      for (const node of nodes) {
        if (!node) continue;

        const selfSuppressed = !resolveMounted(node);
        const effectiveSuppressed = ancestorSuppressed || selfSuppressed;
        const wasSuppressed = node._suppressed;

        node._suppressed = effectiveSuppressed;

        // If suppression state changed, add to dirty set
        if (wasSuppressed !== effectiveSuppressed) {
          hasChanged = true;
          if (ctx.dirtyIds) ctx.dirtyIds.add(node.id);
        }

        if (effectiveSuppressed) {
          currentSuppressed.add(node.id);
        }

        if (node.children && node.children.length > 0) {
          markTree(node.children, effectiveSuppressed);
        }
      }
    };

    markTree(ctx.result, false);

    for (const id of prevSuppressed) {
      if (!currentSuppressed.has(id)) {
        hasChanged = true;
        break;
      }
    }

    ctx.options.__mountGateSuppressed = currentSuppressed;

    if (hasChanged) {
      ctx.hasStructureChanged = true;
    }
  }
};