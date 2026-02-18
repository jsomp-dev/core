import {useSyncExternalStore} from 'react';
import {VisualDescriptor} from '../../../types';
import {ReactAdapter} from '../ReactAdapter';

/**
 * useJsompRuntime Hook
 * Connects React components to the JSOMP Runtime via Adapter.
 * Uses useSyncExternalStore to ensure concurrent mode compatibility and avoid tearing.
 */
export const useJsompRuntime = (adapter: ReactAdapter): VisualDescriptor[] => {
  const nodes = useSyncExternalStore(
    adapter.subscribe,
    adapter.getNodesSnapshot,
    () => [] // SSR Initial Value
  );
  return nodes;
};
