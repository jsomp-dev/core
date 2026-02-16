import {ICompilerContext} from '../types';
import {internalContext as context} from '../../../context';
import {IJsompNode} from '../../../types';

/**
 * Assembles the flat nodes into a tree structure and handles slot distribution.
 */
export const treeAssemblyPlugin = (ctx: ICompilerContext) => {
  const flattener = context.flattener;
  if (!flattener) return;

  // 1. Unflatten basic structure
  const tree = flattener.unflatten<IJsompNode>(ctx.nodes as any, ctx.rootId);

  // 2. Post-processing: Slot distribution (Legacy support)
  const applySlots = (nodes: IJsompNode[]) => {
    nodes.forEach(node => {
      const anyNode = node as any;
      if (anyNode.children && anyNode.children.length > 0) {
        applySlots(anyNode.children);

        const realChildren: IJsompNode[] = [];
        anyNode.children.forEach((child: any) => {
          if (child.__jsomp_slot) {
            const slotName = child.__jsomp_slot;
            delete child.__jsomp_slot;
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

  applySlots(tree);
  ctx.result = tree;
};
