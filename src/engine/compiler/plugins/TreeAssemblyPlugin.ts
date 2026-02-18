import {ICompilerContext, IJsompNode, IJsompPluginDef, PipelineStage} from "../../../types";

/**
 * Assembles the flat nodes into a tree structure and handles slot distribution.
 */
export const treeAssemblyPlugin: IJsompPluginDef = {
  id: 'standard-tree',
  stage: PipelineStage.Hydrate,
  handler: (ctx: ICompilerContext) => {
    // 1. Identify roots (nodes without parent or pointing to non-existent parent)
    const roots: IJsompNode[] = [];
    ctx.nodes.forEach(node => {
      const isRoot = ctx.rootId
        ? node.id === ctx.rootId
        : (!node.parent || (node.parent === 'root' && !ctx.nodes.has('root')) || !ctx.nodes.has(node.parent));

      if (isRoot) {
        roots.push(node);
      }
    });

    // 2. Post-processing: Slot distribution (Legacy support)
    // Runs in-place on logic nodes. Since we want stability, we process each node once.
    const processed = new Set<string>();

    const applySlotsRecursive = (nodes: IJsompNode[]) => {
      nodes.forEach(node => {
        if (processed.has(node.id)) return;
        processed.add(node.id);

        const anyNode = node as any;
        if (anyNode.children && anyNode.children.length > 0) {
          // Recursively process children first
          applySlotsRecursive(anyNode.children);

          const realChildren: IJsompNode[] = [];
          anyNode.children.forEach((child: any) => {
            // In-place slot movement is disabled to prevent React rendering errors with logic node objects.
            // SlotTrait will handle distributing these nodes via descriptor.slots.
            realChildren.push(child);
          });
          anyNode.children = realChildren;
        }
      });
    };

    applySlotsRecursive(roots);
    ctx.result = roots;
  }
};
