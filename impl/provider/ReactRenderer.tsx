import React, {useMemo, memo} from 'react';
import {IJsompNode, IJsompRenderContext} from '../../types';
import {StyleResolver} from './StyleResolver';
import {InjectionRegistry} from '../core/InjectionRegistry';
import {BindingResolver} from '../core/BindingResolver';
import {useAtom} from '../../hook/useAtom';
import {useMustache} from '../../hook/useMustache';
import {context as internalContext} from '../../setup';

/**
 * JsompElement: Implements reactive rendering for a single node.
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
  const {components, atomRegistry, componentRegistry} = context;

  // 1. Path construction
  const fullPath = useMemo(() => {
    return currentPathStr ? `${currentPathStr}.${node.id}` : node.id;
  }, [currentPathStr, node.id]);

  // 2. Subscribe to Injection (path-level state)
  const injection = useAtom(atomRegistry, fullPath);

  // 3. Preliminary property merging
  const {mergedNode, injection: finalInjection} = useMemo(() =>
    InjectionRegistry.resolve(node, fullPath, injection),
    [node, injection, fullPath]
  );

  // 4. Core: Mustache dynamic binding subscription
  // Extract {{key}} references from all properties of the current node
  const mustacheKeys = useMemo(() => {
    return BindingResolver.extractKeys(mergedNode);
  }, [mergedNode]);

  // When atoms corresponding to these keys change, the result here changes, driving the component update
  const mustacheValues = useMustache(atomRegistry, mustacheKeys);

  // 5. Deep resolution of Mustache bindings
  const resolvedNode = useMemo(() => {
    return BindingResolver.resolve(mergedNode, atomRegistry);
  }, [mergedNode, atomRegistry, mustacheValues]);

  // 6. Style and class name resolution
  const {className, style} = useMemo(() => {
    return StyleResolver.resolve(resolvedNode, context);
  }, [resolvedNode, context.stylePresets]);

  // 7. Component lookup (priority: context.components -> then ComponentRegistry -> finally fallback)
  const Component = useMemo(() => {
    // 1. Priority: Local component table passed via rendering context
    const contextComp = components?.[resolvedNode.type];
    if (contextComp) return contextComp;

    // 2. Secondary: Global component registry
    const regComp = componentRegistry?.get(resolvedNode.type);
    if (regComp) return regComp;

    // 3. Final: Fallback to native tags or div
    const type = resolvedNode.type || 'div';

    if (resolvedNode.type) {
      internalContext.logger.warn(`Component type "${resolvedNode.type}" not found in registries. Falling back to native tag or div.`);
    }

    // Check if it's PascalCase (starts with uppercase)
    // React will error if a PascalCase string is used as a tag name without being a component
    const isPascal = /^[A-Z]/.test(type);
    return isPascal ? 'div' : type;
  }, [resolvedNode.type, components, componentRegistry]);

  // --- 8. Helper logic: Recurse and render JSOMP nodes within Props (solving "Objects are not valid as React child") ---
  const renderJsompInProps = (val: any, pathIdx = 0): any => {
    if (!val || typeof val !== 'object') return val;
    // Guard: If it's already a React element, return directly
    if (React.isValidElement(val)) return val;
    if (Array.isArray(val)) return val.map((v, i) => renderJsompInProps(v, i));

    // If detected as a JSOMP node (contains type and props)
    if (val.type && val.props) {
      const subNode = val as IJsompNode;
      const subId = subNode.id || `prop_node_${pathIdx}`;
      return (
        <ReactRenderer
          key={subId}
          nodes={[{...subNode, id: subId}]}
          context={context}
          _parentPath={`${fullPath}.[prop]`}
        />
      );
    }

    // Recursively process nested objects
    const res: any = {};
    Object.entries(val).forEach(([k, v], i) => {
      res[k] = renderJsompInProps(v, i);
    });
    return res;
  };

  // 8. Property filtering and action injection
  const finalProps = useMemo(() => {
    // First, process nested component rendering within Props
    const props: any = renderJsompInProps({
      ...resolvedNode.props,
      id: resolvedNode.id,
      'data-jsomp-path': fullPath,
      className,
      style,
      ...((finalInjection as any).onEvent || {})
    });

    // --- Core Enhancement: Implement Two-way Mustache Binding (Auto-Sync) ---
    const meta = componentRegistry?.getMeta(resolvedNode.type);
    if (meta) {
      const originalProps = mergedNode.props as any;
      const eventNames = meta.events || [];

      // A. value binding -> auto inject change listener
      const valueKey = BindingResolver.getBindingKey(originalProps?.value);
      if (valueKey) {
        const syncEvent = eventNames.find(e => e === 'onChange' || e === 'onValueChange');
        if (syncEvent && !props[syncEvent]) {
          props[syncEvent] = (val: any) => {
            const actualValue = (val && typeof val === 'object' && 'target' in val) ? (val.target as any).value : val;
            atomRegistry.set(valueKey, {value: actualValue});
          };
        }
      }

      // B. checked binding -> auto inject check listener
      const checkedKey = BindingResolver.getBindingKey(originalProps?.checked);
      if (checkedKey) {
        const syncEvent = eventNames.find(e => e === 'onCheckedChange');
        if (syncEvent && !props[syncEvent]) {
          props[syncEvent] = (val: any) => {
            const actualChecked = typeof val === 'boolean' ? val : !!(val?.target?.checked);
            atomRegistry.set(checkedKey, {value: actualChecked});
          };
        }
      }
    }

    return props;
  }, [resolvedNode, className, style, finalInjection, atomRegistry, componentRegistry, mergedNode, fullPath]);

  // 9. Recursive children rendering
  const children = useMemo(() => {
    const childrenNodes = (resolvedNode as any).children as IJsompNode[] | undefined;
    if (childrenNodes && childrenNodes.length > 0) {
      return <ReactRenderer nodes={childrenNodes} context={context} _parentPath={fullPath} />;
    }
    // Core fix: Use processed finalProps.children to ensure JSOMP nodes in props are rendered
    return (finalProps as any)?.children;
  }, [resolvedNode, context, fullPath, finalProps]);

  return (
    <Component {...finalProps}>
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
  return (
    <>
      {nodes.map((node) => (
        <JsompElement
          key={node.id}
          node={node}
          context={context}
          currentPathStr={_parentPath}
        />
      ))}
    </>
  );
});
