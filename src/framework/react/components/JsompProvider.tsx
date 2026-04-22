import React, {useEffect} from 'react';
import {setupJsomp} from '../../../setup';
import {JsompConfig} from '../../../types';
import {useJsomp} from '../hooks/useJsomp';

export interface JsompProviderProps {
  /**
   * JSOMP Configuration
   */
  config?: JsompConfig;
  /**
   * Fallback content to display while JSOMP is initializing.
   */
  fallback?: React.ReactNode;
  /**
   * Application content.
   */
  children: React.ReactNode;
  /**
   * Optional callback triggered when JSOMP initialization is successful.
   */
  onMount?: (service: import('../../../types').IJsompService) => void;
}

/**
 * JsompProvider Component
 * Handles the initialization of the JSOMP environment within a React application.
 * 
 * This component calls `setupJsomp` and waits for it to complete before rendering children.
 * It is recommended to wrap the root of your application with this provider.
 */
export const JsompProvider: React.FC<JsompProviderProps> = ({
  config,
  fallback = null,
  children,
  onMount
}) => {
  // Use the reactive useJsomp hook to track setup status.
  const {isReady} = useJsomp();

  useEffect(() => {
    // Only trigger setup if not already setup.
    // setupJsomp itself has a shared promise to handle concurrent calls.
    if (!isReady) {
      setupJsomp(config).catch((err) => {
        console.error('[JSOMP] Failed to initialize JSOMP:', err);
      });
    }
  }, []); // Only initialize once on mount. Dynamic config changes are not supported.

  const {service} = useJsomp();
  const hasCalledOnMount = React.useRef(false);

  useEffect(() => {
    if (isReady && service && onMount && !hasCalledOnMount.current) {
      onMount(service);
      hasCalledOnMount.current = true;
    }
  }, [isReady, service, onMount]);

  // Reset the flag if the environment is cleared (isReady becomes false)
  useEffect(() => {
    if (!isReady) {
      hasCalledOnMount.current = false;
    }
  }, [isReady]);

  if (!isReady) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
