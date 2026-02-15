import {useSyncExternalStore, useMemo, useRef, useCallback} from 'react';
import {IAtomRegistry, IJsompAtom} from '../types';

function isAtom(obj: any): obj is IJsompAtom {
  return obj && typeof obj.subscribe === 'function' && 'value' in obj;
}

function shallowArrayEqual(a: any[], b: any[]) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

/**
 * Hook: Subscribe to a set of Mustache Keys
 * This is the core of the JSOMP reactive system. It aggregates multiple atom states into a stable snapshot.
 */
export function useMustache(registry: IAtomRegistry, keys: string[]): any[] {
  const lastSnapshot = useRef<any[]>([]);

  // 1. Subscription function: Captures all current keys via closure.
  const subscribe = useCallback((callback: () => void) => {
    if (keys.length === 0) return () => { };
    // Subscribe to each key. Since AtomRegistry supports atom proxying,
    // it will listen to both registry.set and atom.set.
    const unsubs = keys.map(k => registry.subscribe(k, callback));
    return () => unsubs.forEach(u => u());
  }, [registry, JSON.stringify(keys)]); // Use stringify to ensure re-subscription when array content changes

  // 2. Snapshot function: Must maintain reference stability to prevent infinite re-renders in React.
  const getSnapshot = useCallback(() => {
    const nextValues = keys.map(k => {
      const atom = registry.get(k);
      // Get current instantaneous value
      return isAtom(atom) ? atom.value : (atom?.value ?? atom);
    });

    // Only update the reference and return a new array when the content truly changes.
    if (shallowArrayEqual(nextValues, lastSnapshot.current)) {
      return lastSnapshot.current;
    }
    lastSnapshot.current = nextValues;
    return nextValues;
  }, [registry, JSON.stringify(keys)]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
