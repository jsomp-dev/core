import {IJsompPluginDef, PipelineStage} from '../types';

/**
 * IncrementalDiscoveryPlugin
 * Responsibility: Logic node promotion with persistent structure awareness.
 * 
 * Logic:
 * 1. Promotes raw entities to logic nodes (IJsompNode).
 * 2. Compares parent relationships to detect topology shifts.
 * 3. Supports partial updates for O(1) attribute synchronization.
 */
export const incrementalDiscoveryPlugin: IJsompPluginDef = {
  id: 'standard-incremental-discovery',
  stage: PipelineStage.ReStructure,
  handler: (ctx) => {
    // If full compile, clear all existing children links to allow clean rebuilding.
    // This is vital because other plugins (like PathResolution) might have created nodes
    // but not yet established parent-child links in the current compiler instance.
    if (!ctx.dirtyIds) {
      ctx.nodes.forEach(node => {
        (node as any).children = [];
      });
    }
  },
  onNode: (id, entity, ctx) => {
    const oldNode = ctx.nodes.get(id);
    const oldParent = oldNode?.parent;
    const newParent = entity.parent;

    // 1. Resolve target logic node (reuse or create)
    const node: any = oldNode ? oldNode : {id: entity.id || id, children: []};

    // 2. O(1) Optimization check
    // Only skip if structure is stable AND we are in incremental mode.
    // In full compile, we must proceed to establish parent-child links.
    if (oldNode && oldParent === newParent && ctx.dirtyIds) {
      node.props = {...node.props, ...entity.props};

      // Copy other volatile fields
      if (entity.style_presets) node.style_presets = entity.style_presets;
      if (entity.style_tw) node.style_tw = entity.style_tw;
      if (entity.style_css) node.style_css = entity.style_css;

      return;
    }

    // 3. Topology Shift detected or New Node
    if (oldNode) {
      // ctx.logger.debug(`[IncrementalDiscovery] Topology shift detected for node ${id}: ${oldParent} -> ${newParent}`);

      // Remove from old parent children
      if (oldParent) {
        const oldParentNode = ctx.nodes.get(oldParent) as any;
        if (oldParentNode && oldParentNode.children) {
          oldParentNode.children = oldParentNode.children.filter((c: any) => c.id !== id);
        }
      }
    }

    // 4. Promote/Refresh logic node
    node.type = entity.type;
    node.props = entity.props ? {...entity.props} : (node.props || {});
    node.parent = newParent;

    // Sync styles
    if (entity.style_presets) node.style_presets = entity.style_presets;
    if (entity.style_tw) node.style_tw = entity.style_tw;
    if (entity.style_css) node.style_css = entity.style_css;

    // Attach to new parent children immediately if parent exists in logic tree
    if (newParent) {
      // 💡 Support immediate self-linking for cycle detection or forward-referencing if node is its own parent
      const newParentNode = (newParent === id ? node : ctx.nodes.get(newParent)) as any;
      if (newParentNode) {
        newParentNode.children = newParentNode.children || [];
        if (!newParentNode.children.find((c: any) => c.id === id)) {
          newParentNode.children.push(node);
        }
      }
    }

    ctx.nodes.set(id, node);
  }
};
