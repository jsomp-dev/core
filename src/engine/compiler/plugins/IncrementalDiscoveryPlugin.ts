import {IJsompPluginDef, PipelineStage} from "../../../types";

/**
 * IncrementalDiscoveryPlugin
 * Responsibility: Logic node promotion with persistent structure awareness.
 * 
 * Logic:
 * 1. Promotes raw entities to logic nodes (IJsompNode).
 * 2. Compares parent relationships to detect topology shifts.
 * 3. Supports partial updates for O(1) attribute synchronization.
 * 4. Handles node deletion when the source entity is removed from the dataset.
 */
export const incrementalDiscoveryPlugin: IJsompPluginDef = {
  id: 'standard-incremental-discovery',
  stage: PipelineStage.ReStructure,
  handler: (ctx) => {
    // If full compile OR full-dataset update, clear all existing children links to allow clean rebuilding.
    // This ensures that the array order in TEST_LAYOUT is correctly reflected in the children arrays.
    const isFullDataset = ctx.dirtyIds && ctx.dirtyIds.size === ctx.entities.size;

    if (!ctx.dirtyIds || isFullDataset) {
      ctx.nodes.forEach(node => {
        (node as any).children = [];
      });
    }
  },
  onNode: (id, entity, ctx) => {
    const oldNode = ctx.nodes.get(id);

    // --- DELETION LOGIC ---
    if (!entity) {
      if (oldNode) {
        const oldParent = oldNode.parent;
        if (oldParent) {
          const parentIds = Array.isArray(oldParent) ? oldParent : [oldParent];
          parentIds.forEach(pId => {
            const oldParentNode = ctx.nodes.get(pId) as any;
            if (oldParentNode && oldParentNode.children) {
              oldParentNode.children = oldParentNode.children.filter((c: any) => c.id !== id);
            }
          });
        }
        ctx.nodes.delete(id);
        ctx.hasStructureChanged = true;
      }
      return;
    }

    const oldParent = oldNode?.parent;
    const newParent = entity.parent;

    // 1. Resolve target logic node (reuse or create)
    const node: any = oldNode ? oldNode : {id: entity.id || id, children: []};

    // 2. O(1) Optimization check
    // Only skip if structure is stable AND we are in incremental mode.
    // In full compile OR full-dataset feed, we must proceed to establish parent-child links to ensure order.
    const isFullDataset = ctx.dirtyIds && ctx.dirtyIds.size === ctx.entities.size;
    if (oldNode && oldParent === newParent && ctx.dirtyIds && !isFullDataset) {
      node.props = {...node.props, ...entity.props};
      node.trackInstance = entity.trackInstance;

      // Copy other volatile fields
      if (entity.style_presets) node.style_presets = entity.style_presets;
      if (entity.style_tw) node.style_tw = entity.style_tw;
      if (entity.style_css) node.style_css = entity.style_css;

      return;
    }

    // 3. Topology Shift detected or New Node
    if (oldNode) {
      // ctx.logger.debug(`[IncrementalDiscovery] Topology shift detected for node ${id}: ${oldParent} -> ${newParent}`);
      ctx.hasStructureChanged = true;

      // Remove from old parent children
      if (oldParent) {
        const parentIds = Array.isArray(oldParent) ? oldParent : [oldParent];
        parentIds.forEach(pId => {
          const oldParentNode = ctx.nodes.get(pId) as any;
          if (oldParentNode && oldParentNode.children) {
            oldParentNode.children = oldParentNode.children.filter((c: any) => c.id !== id);
          }
        });
      }
    }

    // 4. Promote/Refresh logic node
    node.type = entity.type;
    node.trackInstance = entity.trackInstance;
    node.props = entity.props ? {...entity.props} : (node.props || {});
    node.actions = entity.actions ? {...entity.actions} : (node.actions || {});
    node.parent = newParent;

    // Sync styles
    if (entity.style_presets) node.style_presets = entity.style_presets;
    if (entity.style_tw) node.style_tw = entity.style_tw;
    if (entity.style_css) node.style_css = entity.style_css;

    // Attach to new parent children immediately if parent exists in logic tree
    if (newParent) {
      const parentIds = Array.isArray(newParent) ? newParent : [newParent];
      parentIds.forEach(pId => {
        // Resolve parent node: reuse existing, use self if same ID, or create placeholder
        let newParentNode = (pId === id ? node : ctx.nodes.get(pId)) as any;
        
        if (!newParentNode) {
          // Create placeholder parent node to support forward-referencing
          newParentNode = {id: pId, children: []};
          ctx.nodes.set(pId, newParentNode);
        }

        newParentNode.children = newParentNode.children || [];
        if (!newParentNode.children.find((c: any) => c.id === id)) {
          newParentNode.children.push(node);
        }
      });
    }

    ctx.nodes.set(id, node);
  }
};
