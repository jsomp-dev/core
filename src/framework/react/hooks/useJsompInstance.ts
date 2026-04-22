import {useSyncExternalStore} from 'react';
import {useJsomp} from './useJsomp';

/**
 * useJsompInstance Hook
 * Retrieves a component instance by its ID or Path and subscribes to its changes.
 * 
 * This hook is safe to use before initialization. It will return undefined
 * until JSOMP is setup and the instance is registered.
 * 
 * @param idOrPath - The unique ID or hierarchical path of the component instance.
 * @returns The component instance (or Proxy for remote instances), or undefined if not found.
 */
export const useJsompInstance = <T = any>(idOrPath: string): T | undefined => {
  const {service, isReady} = useJsomp();

  return useSyncExternalStore(
    (onStoreChange) => {
      if (!isReady || !service) return () => {};
      return service.instances.on(idOrPath, onStoreChange);
    },
    () => {
      if (!isReady || !service) return undefined;
      return service.instances.get<T>(idOrPath);
    },
    () => undefined // SSR Initial Value
  );
};
