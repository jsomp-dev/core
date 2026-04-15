import {ICompilerContext, IJsompPluginDef, PipelineStage} from "../../../types";

/**
 * WindowPlugin
 * 
 * Responsibility: Handle 'window' type nodes as core protocol elements.
 * 1. Ensures window nodes are identified as system-level nodes.
 * 2. (Future) Validates that window nodes are at the root level.
 * 3. (Future) Merges multiple window nodes if they exist.
 */
export const windowPlugin: IJsompPluginDef = {
  id: 'standard-window',
  stage: PipelineStage.Hydrate,
  targetTypes: ['window'],
  onNode: (id, entity, ctx: ICompilerContext) => {
    // Currently, standard ActionTags and PropsTrait handle the basics.
    // This plugin serves as an anchor for core window-specific logic.
    
    const node = ctx.nodes.get(id);
    if (!node) return;

    // We can add core metadata here if needed
    // For example, marking it as a "System" node
    (node as any)._isSystemNode = true;

    if (node.parent) {
      ctx.logger.warn(`[WindowPlugin] Node "${id}" of type "window" is nested under "${node.parent}". Window nodes should ideally be roots.`);
    }
  }
};
