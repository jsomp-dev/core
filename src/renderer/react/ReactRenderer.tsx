import React, {createContext, Fragment, memo, ReactNode, useContext, useLayoutEffect, useMemo} from 'react';
import {VisualDescriptor} from '../../types';
import {jsompEnv} from '../../JsompEnv';
import {PerformanceMonitor} from '../PerformanceMonitor';
import {ReactAdapter} from './ReactAdapter';

/**
 * Context for O(1) node lookup during recursive rendering
 */
const JsompNodesContext = createContext<Map<string, VisualDescriptor>>(new Map());

/**
 * Context for local component overrides
 */
const JsompComponentsContext = createContext<Record<string, any>>({});

/**
 * JsompNodeItem
 * Zero-Logic Atomic Renderer.
 */
const JsompNodeItem = memo(({id}: {id: string}) => {
  const nodesMap = useContext(JsompNodesContext);
  const localComponents = useContext(JsompComponentsContext);
  const descriptor = nodesMap.get(id);

  // Inner memoization to block re-render if descriptor reference is stable
  return useMemo(() => {
    if (!descriptor) return null;

    // 1. Resolve Component
    let Component: any = descriptor.componentType;

    // Step 1: Try local overrides (Props)
    // noinspection SuspiciousTypeOfGuard
    if (typeof descriptor.componentType === 'string') {
      if (localComponents[descriptor.componentType]) {
        Component = localComponents[descriptor.componentType];
      } else {
        // Step 2: Try global registry
        const registered = jsompEnv.service?.componentRegistry.get(descriptor.componentType);
        if (registered) {
          Component = registered;
        }
      }
    }

    if (!Component) {
      // noinspection SuspiciousTypeOfGuard
      if (typeof descriptor.componentType === 'string') {
        console.warn(`[JsompRenderer] Component not found: ${descriptor.componentType}`);
        return null;
      }
    }

    // FINAL SAFETY: If Component is still a string and starts with Uppercase, but not in registry/local,
    // React will warn about incorrect casing. We should probably only allow lowercase (native tags) or functions.
    if (typeof Component === 'string' && /^[A-Z]/.test(Component)) {
      console.error(`[JsompRenderer] Detected unresolved PascalCase component name: "${Component}". This will cause React warning. Skipping render.`);
      return null;
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
          slotProps[name] = <Fragment>{rendered}</Fragment>;
        }
      });
    }

    // 3. Render
    // If children (nodes) is empty, we must fallback to props.children (e.g. text content)
    // Otherwise, spreading props.children into Component while also passing undefined as child 
    // will wipe out the text.
    const finalChildren = children.length > 0 ? children : descriptor.props.children;

    return (
      <Component {...descriptor.props} {...slotProps} style={descriptor.styles}>
        {finalChildren}
      </Component>
    );
  }, [descriptor, localComponents]);
}, (prev, next) => prev.id === next.id);

/**
 * Zero-Logic React Renderer
 */
export const ReactRenderer = memo(({
  descriptors,
  adapter,
  rootId,
  components = {}
}: {
  descriptors: VisualDescriptor[],
  adapter: ReactAdapter,
  rootId?: string,
  components?: Record<string, any>
}) => {

  // 1. Build lookup map (O(N))
  const nodesMap = useMemo(() => {
    return new Map(descriptors.map(d => [d.id, d]));
  }, [descriptors]);

  // 2. Performance Monitoring
  useLayoutEffect(() => {
    const metrics = adapter.getMetrics();
    const version = adapter.getVersion();
    PerformanceMonitor.instance.report(
      {metrics, version} as any,
      descriptors.length,
      performance.now()
    );
  });

  // 3. Identify Roots
  const roots = useMemo(() => {
    if (rootId) {
      const root = descriptors.find(d => d.id === rootId);
      if (root) return [root];
    }
    return descriptors.filter(d => !d.parentId);
  }, [descriptors, rootId]);

  return (
    <JsompNodesContext.Provider value={nodesMap}>
      <JsompComponentsContext.Provider value={components}>
        {roots.map(node => <JsompNodeItem key={node.id} id={node.id} />)}
      </JsompComponentsContext.Provider>
    </JsompNodesContext.Provider>
  );
});
