import React, {useCallback} from 'react';
import {IJsompNode, IJsompRenderContext} from '../../../types';

/**
 * useExpressionTrait: Provides the capability to recursively transform JSOMP nodes 
 * embedded within Props into live React components.
 */
export const useExpressionTrait = (
  context: IJsompRenderContext,
  path: string,
  Renderer: React.ComponentType<any>
) => {
  const renderJsompInProps = useCallback((val: any, pathIdx = 0): any => {
    if (!val || typeof val !== 'object') return val;
    if (React.isValidElement(val)) return val;
    if (Array.isArray(val)) return val.map((v, i) => renderJsompInProps(v, i));

    if (val.type && val.props) {
      const subNode = val as IJsompNode;
      const subId = subNode.id || `prop_node_${pathIdx}`;
      return (
        <Renderer
          key={subId}
          nodes={[{...subNode, id: subId}]}
          context={context}
          _parentPath={`${path}.[prop]`}
        />
      );
    }


    const res: any = {};
    Object.entries(val).forEach(([k, v], i) => {
      res[k] = renderJsompInProps(v, i);
    });
    return res;
  }, [context, path]);

  return {
    renderJsompInProps
  };
};
