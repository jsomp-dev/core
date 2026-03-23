import React, {useEffect, useMemo, useRef} from 'react';
import {JsompRuntime, SignalCenter} from '../../../engine';
import {ReactAdapter} from '../ReactAdapter';
import {ReactRenderer} from '../ReactRenderer';
import {useJsompRuntime} from '../hooks';
import {IAtomRegistry} from '../../../types';

/**
 * JsompView Props Definition
 */
export interface JsompViewProps {
  /** Entity Map (usually from data reconciliation) */
  entities: Map<string, any> | Record<string, any> | any[];

  /** Root node ID, defaults to "root" */
  rootId?: string;

  /** Component mapping table for local overrides */
  components?: Record<string, any>;

  /** Style presets mapping */
  stylePresets?: Record<string, string[]>;

  /** Callback when the page is mounted and registry is created */
  onMounted?: (registry: IAtomRegistry) => void;

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
  entities,
  rootId,
  components,
  stylePresets,
  onMounted,
  registry
}) => {
  const isFirstRun = useRef(true);
  const runtimeRef = useRef<JsompRuntime | null>(null);

  // 1. Resolve JSOMP Service & Runtime
  const adapter = useMemo(() => {
    // Use standard runtime which leverages the now STATELESS shared compiler
    const runtime = new JsompRuntime();
    runtimeRef.current = runtime;

    const center = new SignalCenter();
    runtime.use(center);

    // Initial Context Injection
    runtime.updateContext({
      components: components as any,
      stylePresets
    });

    // Connectivity: If an external registry (AtomRegistry) is provided, connect it as a fallback
    // This allows sharing states across multiple JsompView instances.
    if (registry) {
      runtime.setRegistryFallback(registry);
    }

    const reactAdapter = new ReactAdapter(runtime, center);

    // Initial Sync Feed for SSR support
    if (entities) {
      const map = normalizeToMap(entities);
      reactAdapter.feed(map);
    }

    // Lifecycle: onMounted
    if (onMounted) {
      onMounted(registry || center as any);
    }

    return reactAdapter;
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
    if (registry) {
      runtimeRef.current?.setRegistryFallback(registry);
    }
  }, [components, stylePresets, registry]);

  // 4. Connect to React Store
  const descriptors = useJsompRuntime(adapter);

  // 5. Render
  return <ReactRenderer descriptors={descriptors} adapter={adapter} rootId={rootId} components={components} />;
};
