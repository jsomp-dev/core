import React, {useMemo, useEffect, useRef} from 'react';
import {JsompRuntime} from '../headless/JsompRuntime';
import {SignalCenter} from '../headless/SignalCenter';
import {ReactAdapter} from '../impl/renderer/ReactAdapter';
import {useJsompRuntime} from '../hook/useJsompRuntime';
import {ReactRenderer} from '../impl/renderer/ReactRenderer';
import {IAtomRegistry, IJsompService} from '../types';

/**
 * JsompPage Props Definition
 */
export interface JsompPageProps {
  /** Entity Map (usually from data reconciliation) */
  entities: Map<string, any> | Record<string, any>;

  /** Root node ID, defaults to "root" */
  rootId?: string;

  /** Component mapping table for local overrides */
  components?: Record<string, any>;

  /** Style presets mapping */
  stylePresets?: Record<string, string[]>;

  /** Callback when the page is mounted and scope is created */
  onMounted?: (scope: IAtomRegistry) => void;

  /** Optional external scope (internal scope created if not provided) */
  scope?: IAtomRegistry;

  /** Optional JSOMP service instance (uses default if not provided) */
  jsomp?: IJsompService;
}

/**
 * JsompPage: The Skeleton (V2)
 * Orchestrates the Runtime, Adapter, and Renderer with minimal logic.
 */
export const JsompPage: React.FC<JsompPageProps> = ({entities}) => {
  const isFirstRun = useRef(true);

  // 1. Instantiate Core (and Initial Feed)
  const adapter = useMemo(() => {
    const runtime = new JsompRuntime();
    const center = new SignalCenter();
    runtime.use(center);

    // Initial Sync Feed for SSR support
    if (entities) {
      const map = entities instanceof Map ? entities : new Map(Object.entries(entities));
      runtime.feed(map);
    }

    return new ReactAdapter(runtime, center);
  }, []); // Stable adapter

  // 2. Data Updates
  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    if (!entities) return;
    const map = entities instanceof Map ? entities : new Map(Object.entries(entities));
    adapter.feed(map);
  }, [entities, adapter]);

  // 3. Connect to React
  const descriptors = useJsompRuntime(adapter);

  // 4. Render
  return <ReactRenderer descriptors={descriptors} adapter={adapter} />;
};
