import {useSyncExternalStore} from 'react';
import {jsompEnv} from '../../../JsompEnv';
import {IJsompEnv, IJsompService} from '../../../types';

/**
 * useJsomp Hook
 * Provides access to the global JSOMP Service and Environment.
 * 
 * This hook allows being called before initialization. If JSOMP is not yet setup,
 * `service` will be undefined and `isReady` will be false. Once initialization
 * completes (e.g., via <JsompProvider /> or manual setupJsomp), the component
 * will automatically re-render with the initialized service.
 * 
 * @returns An object containing the current JSOMP service, environment, and setup status.
 */
export const useJsomp = (): { 
  service: IJsompService | undefined; 
  env: IJsompEnv; 
  isReady: boolean 
} => {
  const isReady = useSyncExternalStore(
    (onStoreChange) => jsompEnv.onSetup(onStoreChange),
    () => jsompEnv.isSetup,
    () => jsompEnv.isSetup // SSR fallback
  );

  return {
    // We use a try-catch or direct access if isReady is true.
    // jsompEnv.service getter throws if not setup, so we only access it if isReady is true.
    service: isReady ? jsompEnv.service : undefined,
    env: jsompEnv,
    isReady
  };
};
