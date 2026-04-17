import {useContext, useSyncExternalStore, useMemo, useRef} from 'react';
import {JsompRenderContext} from '../ReactRenderer';
import {jsompEnv} from '../../../JsompEnv';
import {createPathAwareProxy} from '../../../utils/proxy';
import {ReactRuntimeAdapter} from '../ReactRuntimeAdapter';

/**
 * useAtomProxy - Proxy-based reactive state hook. (V1.2)
 *
 * Provides a "Magic Store" experience with:
 * 1. Deep link access: store.a.b.c
 * 2. On-demand rendering: Only re-renders when accessed properties change.
 * 3. Direct mutation: store.count++ triggers registry updates.
 *
 * @param path - The base dot-notation path to the atom/state
 * @returns A Path-Aware Proxy object
 */
export function useAtomProxy<T = any>(path: string): T {
  const ctx = useContext(JsompRenderContext);
  const pathStack = ctx.pathStack;

  // Resolve reactive source (SignalCenter for local, GlobalRegistry for global)
  const adapter = ctx.runtimeAdapter as ReactRuntimeAdapter;
  const source = adapter?.signalCenter || jsompEnv.service?.atoms;

  if (!source) {
    throw new Error('[Jsomp] useAtomProxy must be used within JsompView or after setupJsomp().');
  }

  // 1. Resolve final path with backtracking logic (Scope Chain)
  const resolvedPath = useMemo(() => {
    if (!pathStack || pathStack.length === 0) return path;

    const key = path;
    for (let i = pathStack.length; i >= 0; i--) {
      const prefix = pathStack.slice(0, i).join('.');
      const full = prefix ? `${prefix}.${key}` : key;
      if ((source as any).get(full) !== undefined) return full;
    }

    return path;
  }, [path, pathStack, source]);

  // 2. Dependency Tracking Storage
  const accessedPaths = useRef(new Set<string>());
  
  // Track the root path by default to ensure re-renders if the base object is replaced
  useMemo(() => {
    accessedPaths.current.add(resolvedPath);
  }, [resolvedPath]);

  const version = useRef(0);

  // 3. Subscribe to Store Changes and get current version
  // useSyncExternalStore ensures we have a consistent view and triggers re-render on version change.
  const currentVersion = useSyncExternalStore(
    (onStoreChange) => {
      // Branch 1: SignalCenter (Bulk Update)
      if ('subscribe' in source && (source as any).dispatch) {
        return (source as any).subscribe((dirtyIds: string[]) => {
          const isDirty = dirtyIds.some(id => 
            accessedPaths.current.has(id) || 
            Array.from(accessedPaths.current).some(p => id.startsWith(p + '.') || p.startsWith(id + '.'))
          );
          if (isDirty) {
            version.current++;
            onStoreChange();
          }
        });
      }

      // Branch 2: AtomRegistry (Keyed Update)
      if ('subscribeAll' in source) {
        return (source as any).subscribeAll((changedKey: string) => {
          const isDirty = accessedPaths.current.has(changedKey) || 
                          Array.from(accessedPaths.current).some(p => changedKey.startsWith(p + '.') || p.startsWith(changedKey + '.'));
          
          if (isDirty) {
            version.current++;
            onStoreChange();
          }
        });
      }

      return () => {};
    },
    () => version.current,
    () => version.current
  );

  // 4. Create Path-Aware Proxy with Access Tracker
  // Including currentVersion ensures the proxy captures the latest snapshot
  const proxy = useMemo(() => {
    return createPathAwareProxy(source as any, resolvedPath, (p) => {
      // Collect dependency during render
      accessedPaths.current.add(p);
    });
  }, [source, resolvedPath, currentVersion]);

  return proxy as T;
}
