import {ICompilerContext, IJsompPluginDef, PipelineStage} from '../types';
import {IJsompNode} from '../../../types';

/**
 * RecursionGuardPlugin
 * Responsibility: Protect the system from infinite recursion or AI hallucinations.
 * Stage: PostAssemble (Global tree inspection)
 * 
 * Logic:
 * 1. DFS traversal to detect circular references.
 * 2. Hard limit on tree depth (32 layers).
 */
export const recursionGuardPlugin: IJsompPluginDef = {
  id: 'standard-recursion-guard',
  stage: PipelineStage.PostAssemble,
  handler: (ctx: ICompilerContext) => {
    if (!ctx.result) return;

    const MAX_DEPTH = 32;

    // Track nodes currently in the recursion stack to detect cycles
    const stack = new Set<string>();

    const check = (node: IJsompNode, depth: number, path: string[]) => {
      const nodeId = node.id || 'unnamed';
      const anyNode = node as any;

      // 1. Cycle Detection (Check BEFORE adding to stack)
      if (stack.has(nodeId)) {
        ctx.logger.throw('CIRCULAR_REFERENCE', `Circular reference detected at node: ${nodeId}. Path: ${path.join(' -> ')} -> ${nodeId}`);
      }

      // 2. Depth Guard
      if (depth >= MAX_DEPTH) {
        if (anyNode.children && anyNode.children.length > 0) {
          ctx.logger.warn(`[RecursionGuard] Max depth (${MAX_DEPTH}) reached at node: ${nodeId}. Truncating children. Path: ${path.join(' -> ')}`);
          anyNode.children = [];
          node.props = {
            ...node.props,
            _error: 'RECURSION_DEPTH_EXCEEDED',
            _errorMsg: 'Security truncation: AI generated tree is too deep.'
          };
        }
        return;
      }

      stack.add(nodeId);
      path.push(nodeId);

      if (anyNode.children && Array.isArray(anyNode.children)) {
        // Use a copy of path for reporting
        anyNode.children.forEach((child: IJsompNode) => check(child, depth + 1, [...path]));
      }

      // Backtrack
      stack.delete(nodeId);
    };

    ctx.result.forEach(root => check(root, 1, []));

    // Explicitly return nothing as we modified in-place for safety (standard for PostAssemble)
    return undefined;
  }
};
