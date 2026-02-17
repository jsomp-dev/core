import React, {memo} from 'react';
import {IJsompNode, IJsompRenderContext} from '../../types';
import {
  usePathTrait,
  useStateTrait,
  useStyleTrait,
  useInteractionTrait,
  useAssemblyTrait,
  useContentTrait
} from './traits';


/**
 * JsompElement: Implements reactive rendering for a single node using the Trait-Pipeline pattern.
 */
const JsompElement = memo(({
  node,
  context,
  currentPathStr
}: {
  node: IJsompNode;
  context: IJsompRenderContext;
  currentPathStr: string;
}) => {
  // 1. Structural Trait -> Resolves the canonical path
  const fullPath = usePathTrait(node, context, currentPathStr);

  // 2. Reactive Trait -> Handles state injections and Mustache resolution
  const state = useStateTrait(node, context, fullPath);

  // 3. Visual Trait -> Resolves style and class names
  const visual = useStyleTrait(state, context);

  // 4. Interaction Trait -> Resolves event handlers and component type
  const {events, Component} = useInteractionTrait(state, context);

  // 5. Assembly Trait -> Computes the final unified props
  const {props} = useAssemblyTrait(state, visual, {events}, context, ReactRenderer);

  // 6. Content Trait -> Resolves the final children tree
  const {children} = useContentTrait(state.resolvedNode, props, context, fullPath, ReactRenderer);


  return (
    <Component {...props}>
      {children}
    </Component>
  );
});


/**
 * ReactRenderer: Entry point for JSOMP recursive rendering engine.
 */
export const ReactRenderer: React.FC<{
  nodes: IJsompNode[];
  context: IJsompRenderContext;
  /** Internal parent path prefix used for recursion */
  _parentPath?: string;
}> = memo(({nodes, context, _parentPath = ''}) => {
  return nodes.map((node) => (
    <JsompElement
      key={node.id}
      node={node}
      context={context}
      currentPathStr={_parentPath}
    />
  )) as any;
});

