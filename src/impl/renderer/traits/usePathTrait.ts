import {IJsompNode, IJsompRenderContext} from "../../../types";
import {useMemo} from "react";

/**
 * usePathTrait: Resolves the canonical path for a JSOMP node.
 */
export const usePathTrait = (node: IJsompNode, context: IJsompRenderContext, currentPathStr: string): string => {
  return useMemo(() => {
    if (context.layout && !currentPathStr.includes('[prop]')) {
      try {
        return context.layout.getNodePath(node);
      } catch (e) {
        // Fallback to legacy string concatenation
      }
    }
    return currentPathStr ? `${currentPathStr}.${node.id}` : node.id;
  }, [currentPathStr, node.id, context.layout, node]);
};