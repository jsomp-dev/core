import React, {useEffect, useMemo, useRef} from 'react';
import {JsompRuntime, SignalCenter} from '../../../engine';
import {ReactRenderer} from '../ReactRenderer';
import {useJsompRuntime} from '../hooks';
import {IAtomRegistry, IJsompService} from '../../../types';
import {jsompEnv} from '../../../JsompEnv';

/**
 * JsompView Props Definition
 */
export interface JsompViewProps {
  /** Unique view identifier, usually using the component id (e.g., 'btn-1', 'main') */
  id: string;

  /** Entity Map (usually from data reconciliation) */
  entities: Map<string, any> | Record<string, any> | any[];

  /** Root node ID, defaults to "root" */
  rootId?: string;

  /** Component mapping table for local overrides */
  components?: Record<string, any>;

  /** Style presets mapping */
  stylePresets?: Record<string, string[]>;

  /** 
   * Callback before component mounting (before context injection and initial data feed). 
   * Usually used for registering custom Actions or global extensions.
   */
  beforeMount?: (service: IJsompService) => void;

  /** Callback after component mounting (before initial data feed). */
  onMount?: (service: IJsompService) => void;

  /** 
   * @deprecated will be removed in next version, please migrate to onMount.
   * Callback after component mounting (before initial data feed).
   */
  onMounted?: (service: IJsompService) => void;

  /** Optional external registry (internal signal registry created if not provided) */
  registry?: IAtomRegistry;
}

/**
 * Helper to normalize various input formats into a Map<string, any>
 */
function normalizeToMap(entities: any): Map<string, any> {
  if (entities instanceof Map) return entities;
  if (Array.isArray(entities)) {
    return new Map(entities.map(item => [item.id || item.key, item]));
  }
  if (typeof entities === 'object' && entities !== null) {
    return new Map(Object.entries(entities));
  }
  return new Map();
}

/**
 * JsompView: The Skeleton
 * Orchestrates the Runtime, Adapter, and Renderer with minimal logic.
 */
export const JsompView: React.FC<JsompViewProps> = ({
  id,
  entities,
  rootId,
  components,
  stylePresets,
  beforeMount,
  onMount,
  onMounted,
  registry
}) => {
  const isFirstRun = useRef(true);
  const runtimeRef = useRef<JsompRuntime | null>(null);

  // 1. Resolve JSOMP Service & Runtime
  const adapter = useMemo(() => {
    if (!jsompEnv.service) {
      throw new Error('Render JsompView failed: Jsomp not initialized. Call setupJsomp() first.');
    }
    // Use standard runtime which leverages the now STATELESS shared compiler
    const runtime = new JsompRuntime();
    runtimeRef.current = runtime;

    const center = new SignalCenter();
    runtime.use(center);

    // Resolve React Framework Adapter
    const reactFrameworkAdapter = jsompEnv.service.frameworks.get('react');
    if (!reactFrameworkAdapter) {
      throw new Error('Render JsompView failed: React framework adapter not found');
    }
    // Create React Runtime Adapter
    const reactRuntimeAdapter = reactFrameworkAdapter.createRuntimeAdapter(id, runtime, center);
    if (!reactRuntimeAdapter) {
      throw new Error('Render JsompView failed: React runtime adapter not found');
    }

    // Lifecycle: beforeMount (Call before context/feed)
    if (beforeMount) {
      beforeMount(jsompEnv.service);
    }

    // Initial Context Injection
    runtime.updateContext({
      components: components as any,
      stylePresets
    });

    // Connectivity: If an external registry (AtomRegistry) is provided, connect it as a fallback.
    // If none provided, try connecting to the global registry from jsompEnv as default.
    const fallbackRegistry = registry || jsompEnv.service.atoms;
    if (fallbackRegistry) {
      runtime.setRegistryFallback(fallbackRegistry);
    }

    // Lifecycle: onMount / onMounted (Call before feed so user can register actions/etc.)
    if (onMount) {
      onMount(jsompEnv.service);
    }
    if (onMounted) {
      onMounted(jsompEnv.service);
    }

    // Set Initial Root ID
    runtime.setRootId(rootId);

    // Initial Sync Feed for SSR support
    if (entities) {
      const map = normalizeToMap(entities);
      reactRuntimeAdapter.feed(map);
    }

    return reactRuntimeAdapter;
  }, []); // Stable adapter for the lifecycle of this page instance

  // 2. Continuous Data Updates (Incremental)
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    if (!entities) return;
    const map = normalizeToMap(entities);
    adapter.feed(map);
  }, [entities, adapter]);

  // 3. Update Pipeline Context when props change
  useEffect(() => {
    runtimeRef.current?.updateContext({
      components: components as any,
      stylePresets
    });

    // Update registry fallback if changes
    const fb = registry || jsompEnv.service?.atoms;
    if (fb) {
      runtimeRef.current?.setRegistryFallback(fb);
    }

    // Update Root ID
    runtimeRef.current?.setRootId(rootId);
  }, [components, stylePresets, registry, rootId]);

  // 4. Connect to React Store
  const descriptors = useJsompRuntime(adapter);

  // 5. Render
  return <ReactRenderer descriptors={descriptors} adapter={adapter} rootId={rootId} components={components} />;
};
