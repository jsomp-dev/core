import {createContext, Fragment, memo, ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useSyncExternalStore} from 'react';
import {jsompEnv} from '../../JsompEnv';
import {PerformanceMonitor} from '../../renderer';
import {IRenderContext, IRuntimeAdapter, VisualDescriptor} from '../../types';
import {ReactRuntimeAdapter} from './ReactRuntimeAdapter';
import {JsompWindow} from './components';
import {useJsompTriggers} from './hooks';

/**
 * Single render context for hooks compatibility.
 */
export const JsompRenderContext = createContext<IRenderContext>({
  components: {},
  pathStack: [],
  slots: {},
  descriptorMap: new Map(),
  runtimeAdapter: null as unknown as IRuntimeAdapter,
  getStableKey: (id: string) => id
});

const pathStackCache = new WeakMap<VisualDescriptor, string[]>();

/**
 * Optimized component resolution
 */
export function resolveComponent(
  descriptor: VisualDescriptor | undefined,
  ctx: IRenderContext,
  parentPathStack: string[] = ctx.pathStack
): {Component: any; props: Record<string, any>; pathStack: string[]; slots: Record<string, string[]>} | null {
  if (!descriptor) return null;

  let currentPathStack = parentPathStack;
  if (descriptor.path) {
    const cached = pathStackCache.get(descriptor);
    if (cached) {
      currentPathStack = cached;
    } else {
      currentPathStack = descriptor.path.split('.');
      pathStackCache.set(descriptor, currentPathStack);
    }
  }

  let Component: any = descriptor.componentType;
  if (typeof descriptor.componentType === 'string') {
    Component = ctx.components[descriptor.componentType] ||
      jsompEnv.service?.components.get(descriptor.componentType) ||
      (descriptor.componentType === 'window' ? JsompWindow : descriptor.componentType);
  }

  if (!Component) return null;

  return {
    Component,
    props: descriptor.props || {},
    pathStack: currentPathStack,
    slots: descriptor.slots || {}
  };
}

/**
 * JsompNodeItem
 * Atomically subscribed to its own descriptor.
 * This is the ultimate performance/correctness balance.
 */
const JsompNodeItem = memo(({id, pathStack, ctx, adapter}: {
  id: string;
  pathStack: string[];
  ctx: IRenderContext;
  adapter: ReactRuntimeAdapter;
}) => {
  // ATOMIC SUBSCRIPTION: 
  // Each node listens to its own data. Because getDescriptor(id) returns stable 
  // references from TraitPipeline, React skips 117/118 nodes at the Hook level.
  const descriptor = useSyncExternalStore(
    adapter.subscribe,
    () => adapter.getDescriptor(id)
  );

  // Hooks must be called unconditionally to avoid React "Rendered more hooks than during the previous render" error
  useJsompTriggers(descriptor);

  const hasFiredOnLoad = useRef(false);
  useEffect(() => {
    if (!descriptor) {
      hasFiredOnLoad.current = false;
      return;
    }
    if (!hasFiredOnLoad.current) {
      hasFiredOnLoad.current = true;
      jsompEnv.service.actions.execute('onLoad', {
        props: descriptor.props || {},
        event: {},
        originEvent: {},
        trigger: 'onLoad',
        namespace: 'lifecycle',
        eventName: 'load',
        contextPath: descriptor.path || id
      }).catch(() => {/* onLoad action may not be registered */});
    }
  }, [descriptor?.id]);

  if (!descriptor) return null;

  // Resolve component using current context and descriptor
  const resolved = resolveComponent(descriptor, ctx, pathStack);
  if (!resolved) return null;

  const {Component, props, pathStack: nextPathStack, slots} = resolved;

  // Prepare slots
  const slotProps: Record<string, any> = {};
  let children: ReactNode = props.children;

  const slotNames = Object.keys(slots);
  if (slotNames.length > 0) {
    const childrenList: ReactNode[] = [];
    for (let i = 0; i < slotNames.length; i++) {
      const name = slotNames[i];
      const ids = slots[name];
      const rendered: ReactNode[] = [];
      for (let j = 0; j < ids.length; j++) {
        const childId = ids[j];
        rendered.push(
          <JsompNodeItem
            key={childId}
            id={childId}
            pathStack={nextPathStack}
            ctx={ctx}
            adapter={adapter}
          />
        );
      }

      if (name === 'children' || name === 'default') {
        childrenList.push(...rendered);
      } else {
        slotProps[name] = <Fragment key={name}>{rendered}</Fragment>;
      }
    }
    if (childrenList.length > 0) {
      children = childrenList;
    }
  }

  return (
    <Component
      {...props}
      {...slotProps}
      style={props.style ?? descriptor.styles}
      // Direct ref callback for instance tracking
      ref={descriptor.trackInstance ? (inst: any) => adapter.reportInstance(id, inst, descriptor.path) : undefined}
    >
      {children}
    </Component>
  );
}, (prev, next) => (
  // Since JsompNodeItem handles its own reactivity via useSyncExternalStore,
  // the parent only re-renders it if the identity (id) or context (components) changes.
  prev.id === next.id &&
  prev.ctx === next.ctx &&
  prev.pathStack === next.pathStack
));

/**
 * Optimized React Renderer
 * Static Shell: Only renders the roots once.
 */
export const ReactRenderer = memo(({
  adapter,
  rootId,
  components = {}
}: {
  adapter: IRuntimeAdapter;
  rootId?: string;
  components?: Record<string, any>;
}) => {
  const runtimeAdapter = adapter as ReactRuntimeAdapter;

  // SUBSCRIPTION FOR ROOTS ONLY:
  // ReactRenderer only re-renders if the list of root IDs changes.
  const rootIdsString = useSyncExternalStore(
    runtimeAdapter.subscribe,
    () => runtimeAdapter.getRootIdsSnapshot(rootId)
  );

  const rootIds = useMemo(() => rootIdsString.split(',').filter(id => id), [rootIdsString]);

  // Async Performance Monitoring
  useLayoutEffect(() => {
    const unsub = runtimeAdapter.subscribe(() => {
      const reportTask = () => {
        PerformanceMonitor.instance.report(
          {metrics: runtimeAdapter.getMetrics(), version: runtimeAdapter.getVersion()} as any,
          runtimeAdapter.getSnapshot().length,
          performance.now()
        );
      };
      if (typeof requestIdleCallback !== 'undefined') requestIdleCallback(reportTask);
      else setTimeout(reportTask, 0);
    });
    return unsub;
  }, [runtimeAdapter]);

  useMemo(() => {
    runtimeAdapter.updateContext({components});
  }, [components, runtimeAdapter]);

  const ctx = runtimeAdapter.currentContext;

  return (
    <JsompRenderContext.Provider value={ctx}>
      {rootIds.map(id => (
        <JsompNodeItem
          key={id}
          id={id}
          pathStack={ctx.pathStack}
          ctx={ctx}
          adapter={runtimeAdapter}
        />
      ))}
    </JsompRenderContext.Provider>
  );
});
