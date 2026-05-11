import {useContext, useSyncExternalStore, useCallback, useMemo, useRef} from 'react';
import {JsompRenderContext} from '../ReactRenderer';
import {jsompEnv} from '../../../JsompEnv';
import {ReactRuntimeAdapter} from '../ReactRuntimeAdapter';
import {pathUtils} from '../../../utils/path';

/**
 * useAtom: Path-aware reactive state hook. (V2)
 *
 * Automatically resolves relative paths based on the current pathStack.
 * Subscribes to changes in the SignalCenter or fallback Global Registry (AtomRegistry).
 *
 * @param path - The dot-notation path to the atom (e.g. "user.profile.name" or "theme")
 * @returns [value, setAtom]
 */
export function useAtom<T = any>(path: string): [T, (val: T | ((prev: T) => T)) => void] {
  const ctx = useContext(JsompRenderContext);
  const pathStack = ctx.pathStack;

  // 1. Resolve reactive source (Primary: Runtime SignalCenter, Fallback: Global Registry)
  const adapter = ctx.runtimeAdapter as ReactRuntimeAdapter;
  const source = adapter?.signalCenter || jsompEnv.service?.atoms;

  if (!source) {
    throw new Error('[Jsomp] useAtom must be used within JsompView or after setupJsomp() (Global Context).');
  }

  // 2. Resolve final path with backtracking logic (Scope Chain)
  const resolvedPath = useMemo(() => {
    // Use pathUtils to resolve with backtracking
    return pathUtils.resolveWithBacktracking(path, pathStack, source as any);
  }, [path, pathStack, source]);

  // Utility to unwrap Atom/AtomValue to raw value
  const unwrapValue = (val: any) => {
    if (val && typeof val === 'object' && 'value' in val) {
      return val.value;
    }
    return val;
  };

  // 3. Subscribe to changes via the Reactive Source
  const value = useSyncExternalStore(
    (onStoreChange) => {
      // Branch 1: SignalCenter (Local/Runtime - Bulk Update) - detects by specific properties
      if ('subscribe' in source && (source as any).dispatch) {
        return (source as any).subscribe((dirtyIds: string[]) => {
          const isDirty = dirtyIds.some(id =>
            resolvedPath === id ||
            resolvedPath.startsWith(id + '.')
          );
          if (isDirty) onStoreChange();
        });
      }

      // Branch 2: AtomRegistry (Global/Internal - Keyed Update)
      if ('subscribe' in source) {
        return (source as any).subscribe(resolvedPath, onStoreChange);
      }

      return () => { };
    },
    () => unwrapValue((source as any).get(resolvedPath)),
    () => unwrapValue((source as any).get(resolvedPath))
  );

  // 4. Setter implementation (stable reference via refs)
  const resolvedPathRef = useRef(resolvedPath);
  resolvedPathRef.current = resolvedPath;
  const sourceRef = useRef(source);
  sourceRef.current = source;

  const setAtom = useCallback((newValue: T | ((prev: T) => T)) => {
    const currentSource = sourceRef.current;
    const currentPath = resolvedPathRef.current;
    const rawVal = (currentSource as any).get(currentPath);
    const current = unwrapValue(rawVal);
    const nextValue = typeof newValue === 'function' ? (newValue as Function)(current) : newValue;

    if ('onUpdate' in currentSource) {
      (currentSource as any).onUpdate(currentPath, nextValue);
    } else {
      (currentSource as any).set(currentPath, nextValue);
    }
  }, []);

  return [value, setAtom];
}
