import React, {Fragment, memo, useMemo, useLayoutEffect, useContext, createContext, ReactNode} from 'react';
import {VisualDescriptor} from '../../types';
import {jsompEnv} from '../../JsompEnv';
import {PerformanceMonitor} from './PerformanceMonitor';
import {ReactAdapter} from './ReactAdapter';

/**
 * Context for O(1) node lookup during recursive rendering
 */
const JsompNodesContext = createContext<Map<string, VisualDescriptor>>(new Map());

/**
 * JsompNodeItem
 * Zero-Logic Atomic Renderer.
 * Relies on React.memo + useMemo (inner) to ensure zero re-rendering for unchanged descriptors.
 */
const JsompNodeItem = memo(({id}: {id: string}) => {
  const nodesMap = useContext(JsompNodesContext);
  const descriptor = nodesMap.get(id);

  // Inner memoization to block re-render if descriptor reference is stable
  // even if Context (nodesMap) identity changed.
  return useMemo(() => {
    if (!descriptor) return null;

    // 1. Resolve Component
    let Component: any = descriptor.componentType;
    // Try registry if string
    if (typeof descriptor.componentType === 'string') {
      Component = jsompEnv.service?.componentRegistry.get(descriptor.componentType);
    }

    if (!Component) {
      if (typeof descriptor.componentType === 'string') {
        // Fallback for primitive HTML tags if allowed or warn
        // Assuming strict registry for now, or maybe generic div?
        console.warn(`[JsompRenderer] Component not found: ${descriptor.componentType}`);
        return null;
      }
    }

    // 2. Resolve Children/Slots
    const slotProps: Record<string, ReactNode> = {};
    const children: ReactNode[] = [];

    if (descriptor.slots) {
      Object.entries(descriptor.slots).forEach(([name, ids]) => {
        const rendered = ids.map(childId => <JsompNodeItem key={childId} id={childId} />);

        if (name === 'children' || name === 'default') {
          children.push(...rendered);
        } else {
          // Flatten if single? Or fragment
          slotProps[name] = <Fragment>{rendered}</Fragment>;
        }
      });
    }

    // 3. Render
    return (
      <Component {...descriptor.props} {...slotProps} style={descriptor.styles}>
        {children.length > 0 ? children : undefined}
      </Component>
    );
  }, [descriptor]);
}, (prev, next) => prev.id === next.id);

/**
 * Zero-Logic React Renderer
 */
export const ReactRenderer = memo(({descriptors, adapter}: {descriptors: VisualDescriptor[], adapter: ReactAdapter}) => {

  // 1. Build lookup map (O(N))
  // Descriptors array is stable from adapter if no changes.
  const nodesMap = useMemo(() => {
    return new Map(descriptors.map(d => [d.id, d]));
  }, [descriptors]);

  // 2. Performance Monitoring
  useLayoutEffect(() => {
    const metrics = adapter.getMetrics();
    // Assuming descriptors length roughly equals active nodes
    PerformanceMonitor.instance.report(
      {metrics, version: -1 /* version available in adapter? */} as any,
      descriptors.length,
      performance.now()
    );
  });

  // 3. Identify Roots (Nodes without parent)
  const roots = useMemo(() => descriptors.filter(d => !d.parentId), [descriptors]);

  return (
    <JsompNodesContext.Provider value={nodesMap}>
      {roots.map(node => <JsompNodeItem key={node.id} id={node.id} />)}
    </JsompNodesContext.Provider>
  );
});
