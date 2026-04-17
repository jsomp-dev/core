import {createContext, Fragment, memo, ReactNode, useContext, useLayoutEffect, useMemo} from 'react';
import {jsompEnv} from '../../JsompEnv';
import {PerformanceMonitor} from '../../renderer';
import {IRenderContext, IRuntimeAdapter, VisualDescriptor} from '../../types';
import {ReactRuntimeAdapter} from './ReactRuntimeAdapter';
import {JsompWindow} from './components';
import {useJsompTriggers} from './hooks';

/**
 * Single render context replacing four separate contexts.
 * Implements IRenderContext — consumed by JsompNodeItem during tree traversal.
 */
export const JsompRenderContext = createContext<IRenderContext>({
  components: {},
  pathStack: [],
  slots: {},
  descriptorMap: new Map(),
  runtimeAdapter: null as unknown as IRuntimeAdapter,
  getStableKey: (id: string) => id
});

export function resolveComponent(
  descriptor: VisualDescriptor | undefined,
  ctx: IRenderContext
): {Component: any; props: Record<string, any>; pathStack: string[]; slots: Record<string, string[]>} | null {
  if (!descriptor) return null;

  const currentPathStack = descriptor.path
    ? descriptor.path.split('.')
    : ctx.pathStack;

  let Component: any = descriptor.componentType;

  if (typeof descriptor.componentType === 'string') {
    if (ctx.components[descriptor.componentType]) {
      Component = ctx.components[descriptor.componentType];
    } else {
      const registered = jsompEnv.service?.components.get(descriptor.componentType);
      if (registered) {
        Component = registered;
      } else if (descriptor.componentType === 'window') {
        Component = JsompWindow;
      }
    }
  }

  if (!Component) {
    if (typeof descriptor.componentType === 'string') {
      console.warn(`[JsompRenderer] Component not found: ${descriptor.componentType}`);
    }
    return null;
  }

  if (typeof Component === 'string' && /^[A-Z]/.test(Component)) {
    console.error(`[JsompRenderer] Detected unresolved PascalCase component name: "${Component}". Skipping render.`);
    return null;
  }

  return {
    Component,
    props: descriptor.props || {},
    pathStack: currentPathStack,
    slots: descriptor.slots || {}
  };
}

/**
 * JsompNodeItem
 * Zero-Logic Atomic Renderer.
 * Consumes IRenderContext instead of individual contexts.
 */
const JsompNodeItem = memo(({id}: {id: string}) => {
  const ctx = useContext(JsompRenderContext);
  const descriptor = ctx.descriptorMap.get(id);

  useJsompTriggers(descriptor);

  return useMemo(() => {
    const resolved = resolveComponent(descriptor, ctx);
    if (!resolved) return null;

    const {Component, props, pathStack, slots} = resolved;

    const slotProps: Record<string, ReactNode> = {};
    const children: ReactNode[] = [];

    Object.entries<string[]>(slots).forEach(([name, ids]) => {
      const rendered = ids.map(childId => <JsompNodeItem key={ctx.getStableKey(childId)} id={childId} />);

      if (name === 'children' || name === 'default') {
        children.push(...rendered);
      } else {
        slotProps[name] = <Fragment>{rendered}</Fragment>;
      }
    });

    const finalChildren = children.length > 0 ? children : props.children;

    const runtimeAdapter = ctx.runtimeAdapter as ReactRuntimeAdapter;
    runtimeAdapter.updateContext({pathStack, slots});

    return (
      <JsompRenderContext.Provider value={ctx}>
        <Component {...props} {...slotProps} style={props.style ?? descriptor?.styles}>
          {finalChildren}
        </Component>
      </JsompRenderContext.Provider>
    );
  }, [descriptor, ctx]);
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
  descriptors: VisualDescriptor[];
  adapter: IRuntimeAdapter;
  rootId?: string;
  components?: Record<string, any>;
}) => {
  // 1. Build lookup map (O(N))
  const descriptorMap = useMemo(() => {
    return new Map(descriptors.map(d => [d.id, d]));
  }, [descriptors]);

  // 2. Performance Monitoring
  useLayoutEffect(() => {
    const metrics = adapter.getMetrics?.();
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

  const runtimeAdapter = adapter as ReactRuntimeAdapter;
  runtimeAdapter.updateContext({components, descriptorMap});

  return (
    <JsompRenderContext.Provider value={runtimeAdapter.currentContext}>
      {roots.map(node => <JsompNodeItem key={runtimeAdapter.currentContext.getStableKey(node.id)} id={node.id} />)}
    </JsompRenderContext.Provider>
  );
});

