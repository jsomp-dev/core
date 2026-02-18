import {ICompilerContext, IJsompPluginDef, PipelineStage} from '../types';
import {IJsompNode} from '../../../types';

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
            if (child.slot) {
              const slotName = child.slot;
              // Clean up slot after use to keep the tree pure for the renderer
              delete child.slot;

              node.props = node.props || {};
              const prev = node.props[slotName];

              if (prev) {
                if (Array.isArray(prev)) {
                  prev.push(child);
                } else {
                  node.props[slotName] = [prev, child];
                }
              } else {
                node.props[slotName] = child;
              }
            } else {
              realChildren.push(child);
            }
          });
          anyNode.children = realChildren;
        }
      });
    };

    applySlotsRecursive(roots);
    ctx.result = roots;
  }
};
