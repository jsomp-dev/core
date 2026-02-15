import {useSyncExternalStore, useMemo} from 'react';
import {IAtomValue, IAtomRegistry} from '../types';

/**
 * Hook: Subscribe to atomic state at a specific path
 * Re-renders the component only when the data at the specified path in the registry changes.
 */
export function useAtom(registry: IAtomRegistry, path: string): IAtomValue | undefined {
  // 1. Subscription function (closure bound to path)
  // useSyncExternalStore requires a stable subscription function reference unless parameters change.
  const subscribe = useMemo(() => {
    return (callback: () => void) => registry.subscribe(path, callback);
  }, [registry, path]);

  // 2. Snapshot reading function
  // Must return a cached value reference to avoid infinite loops (Map.get usually returns a stable reference unless set with a new object).
  const getSnapshot = () => {
    return registry.get(path);
  };

  // 3. Core React Hook
  return useSyncExternalStore(subscribe, getSnapshot);
}
