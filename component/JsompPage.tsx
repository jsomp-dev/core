import React, {useEffect, useMemo} from 'react';
import {IAtomRegistry, IJsompNode} from '../types';
import {ReactRenderer} from '../impl/provider/ReactRenderer';
import {jsomp as defaultJsomp} from '../setup';

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
  jsomp?: any;
}

/**
 * JsompPage: High-level container component
 * Responsibility: Encapsulates scope creation, tree restoration, and rendering logic.
 */
export const JsompPage: React.FC<JsompPageProps> = ({
  entities,
  rootId = "root",
  components,
  stylePresets,
  onMounted,
  scope: externalScope,
  jsomp = defaultJsomp
}) => {
  // 1. Manage scope lifecycle
  const atomRegistry = useMemo(() => {
    return externalScope || jsomp?.createScope();
  }, [externalScope, jsomp]);

  // 2. Handle data conversion automatically
  const nodes = useMemo(() => {
    if (!jsomp || !atomRegistry) return [] as IJsompNode[];

    // Supports Map, Array, or Plain Object inputs
    let entityMap: Map<string, any>;
    if (entities instanceof Map) {
      entityMap = entities;
    } else if (Array.isArray(entities)) {
      entityMap = new Map();
      entities.forEach((e: any) => {
        if (e && typeof e === 'object' && e.id) {
          entityMap.set(e.id, e);
        }
      });
    } else {
      entityMap = new Map(Object.entries(entities));
    }

    return jsomp.restoreTree(entityMap, rootId, atomRegistry);
  }, [entities, rootId, jsomp, atomRegistry]);

  // 3. Mount notification
  useEffect(() => {
    if (atomRegistry) {
      onMounted?.(atomRegistry);
    }
  }, [atomRegistry, onMounted]);

  if (!atomRegistry) return null;

  return (
    <ReactRenderer
      nodes={nodes}
      context={{
        atomRegistry,
        components,
        componentRegistry: jsomp.componentRegistry,
        stylePresets
      }}
    />
  );
};
