import {useSyncExternalStore} from 'react';
import {IRuntimeAdapter, VisualDescriptor} from '../../../types';

/**
 * useJsompRuntime Hook
 * Connects React components to the JSOMP Runtime via IRuntimeAdapter.
 * Uses useSyncExternalStore to ensure concurrent mode compatibility and avoid tearing.
 */
export const useJsompRuntime = (adapter: IRuntimeAdapter): VisualDescriptor[] => {
  const nodes = useSyncExternalStore(
    adapter.subscribe,
    () => adapter.getSnapshot(),
    () => [] // SSR Initial Value
  );
  return nodes;
};
