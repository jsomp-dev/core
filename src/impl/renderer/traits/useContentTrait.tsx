import React, {useMemo} from 'react';
import {
  IJsompNode,
  IJsompRenderContext,
  IContentTrait
} from '../../../types';
/**
 * useContentTrait: Negotiates the final React children, merging structural nodes
 * and prop-based children while applying AI anti-hallucination logic.
 */
export const useContentTrait = (
  resolvedNode: IJsompNode,
  finalProps: any,
  context: IJsompRenderContext,
  path: string,
  Renderer: React.ComponentType<any>
): IContentTrait => {
  const children = useMemo(() => {
    const childrenNodes = (resolvedNode as any).children as IJsompNode[] | undefined;
    const hasStructuralChildren = childrenNodes && childrenNodes.length > 0;
    let propChildren = finalProps?.children;

    // AI Anti-hallucination: Filter out ID-list strings if structural children exist
    if (typeof propChildren === 'string' && propChildren.includes('_')) {
      const looksLikeIds = propChildren.split(',').every(id => id.trim().length > 0);
      if (looksLikeIds && hasStructuralChildren) {
        propChildren = null;
      }
    }

    if (hasStructuralChildren) {
      const structural = <Renderer nodes={childrenNodes} context={context} _parentPath={path} />;
      if (propChildren) {
        return <React.Fragment>{propChildren}{structural}</React.Fragment>;
      }
      return structural;
    }


    return propChildren;
  }, [resolvedNode, context, path, finalProps?.children]);

  return {
    children
  };
};
