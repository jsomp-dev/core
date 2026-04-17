import {useContext, useSyncExternalStore, useCallback, useMemo} from 'react';
import {JsompRenderContext} from '../ReactRenderer';
import {jsompEnv} from '../../../JsompEnv';
import {ReactRuntimeAdapter} from '../ReactRuntimeAdapter';

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
    // We only perform backtracking if used within a JsompView (with pathStack)
    if (!pathStack || pathStack.length === 0) return path;

    const key = path;
    for (let i = pathStack.length; i >= 0; i--) {
      const prefix = pathStack.slice(0, i).join('.');
      const full = prefix ? `${prefix}.${key}` : key;
      if ((source as any).get(full) !== undefined) return full;
    }

    return path;
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

  // 4. Setter implementation
  const setAtom = useCallback((newValue: T | ((prev: T) => T)) => {
    const rawVal = (source as any).get(resolvedPath);
    const current = unwrapValue(rawVal);
    const nextValue = typeof newValue === 'function' ? (newValue as Function)(current) : newValue;

    if ('onUpdate' in source) {
      (source as any).onUpdate(resolvedPath, nextValue);
    } else {
      (source as any).set(resolvedPath, nextValue);
    }
  }, [resolvedPath, source]);

  return [value, setAtom];
}
