import {useContext, useSyncExternalStore, useCallback, useMemo} from 'react';
import {JsompPathContext, JsompRuntimeContext} from '../ReactRenderer';

/**
 * useAtom: Path-aware reactive state hook. (V2)
 * 
 * Automatically resolves relative paths based on the current JsompPathContext.
 * Subscribes to changes in the SignalCenter for the resolved path.
 * 
 * @param path - The dot-notation path to the atom (e.g. "user.profile.name" or "theme")
 * @returns [value, setAtom]
 */
export function useAtom<T = any>(path: string): [T, (val: T | ((prev: T) => T)) => void] {
  const adapter = useContext(JsompRuntimeContext);
  const pathStack = useContext(JsompPathContext);

  if (!adapter) {
    throw new Error('[Jsomp] useAtom must be used within JsompView or JsompRuntimeContext.Provider');
  }

  const {signalCenter} = adapter;

  // Resolve final path with backtracking logic (Scope Chain)
  const resolvedPath = useMemo(() => {
    // 1. If no stack, use as is
    if (!pathStack || pathStack.length === 0) return path;
    
    // 2. We only perform backtracking if the path is a relative key
    // Implementation: Try prefixed path from deep to shallow
    const key = path;
    
    for (let i = pathStack.length; i >= 0; i--) {
      const prefix = pathStack.slice(0, i).join('.');
      const full = prefix ? `${prefix}.${key}` : key;
      if (signalCenter.get(full) !== undefined) return full;
    }
    
    return path;
  }, [path, pathStack, signalCenter]);

  // Subscribe to changes via the SignalCenter
  const value = useSyncExternalStore(
    (onStoreChange) => {
      return signalCenter.subscribe((dirtyIds) => {
        // V1.1: Support deep subscription. 
        // If a parent path is dirty (e.g., 'user' was replaced), 
        // all child paths (e.g., 'user.profile.age') are also implicitly dirty.
        const isDirty = dirtyIds.some(id => 
          resolvedPath === id ||              // Exact match
          resolvedPath.startsWith(id + '.')   // Parent match
        );

        if (isDirty) {
          onStoreChange();
        }
      });
    },
    () => signalCenter.get(resolvedPath),
    () => signalCenter.get(resolvedPath)
  );

  // Setter implementation
  const setAtom = useCallback((newValue: T | ((prev: T) => T)) => {
    const current = signalCenter.get(resolvedPath);
    const nextValue = typeof newValue === 'function' ? (newValue as Function)(current) : newValue;
    signalCenter.onUpdate(resolvedPath, nextValue);
  }, [resolvedPath, signalCenter]);

  return [value, setAtom];
}
