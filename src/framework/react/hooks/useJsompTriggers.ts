import {useEffect} from 'react';
import {VisualDescriptor} from '../../../types';
import {jsompEnv} from '../../../JsompEnv';

/**
 * useJsompTriggers
 * Automatically subscribe to custom namespace triggers and link them to component props.
 */
export function useJsompTriggers(descriptor: VisualDescriptor | undefined) {
  useEffect(() => {
    if (!descriptor || !descriptor.triggers || descriptor.triggers.length === 0) return;

    const unsubs: Array<() => void> = [];

    descriptor.triggers.forEach(trigger => {
      const source = jsompEnv.service.actions.getTriggerSource(trigger.namespace);
      if (source) {
        // Find the mapped handler in props
        const handler = descriptor.props[trigger.prop];
        if (typeof handler === 'function') {
          const unsub = source.subscribe(trigger.event, (payload) => {
            handler(payload);
          });
          unsubs.push(unsub);
        }
      }
    });

    return () => unsubs.forEach(u => u());
  }, [descriptor]);
}
