import React, {useEffect, useMemo} from 'react';
import {IAtomRegistry, IJsompNode} from '../types';
import {ReactRenderer} from '../impl/provider/ReactRenderer';
import {jsomp as defaultJsomp, context as internalContext} from '../setup';

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

  // 2. Local state for dynamic nodes added at runtime (e.g., via streaming)
  const [dynamicNodes, setDynamicNodes] = React.useState<Map<string, IJsompNode>>(new Map());

  // 3. Listen for global changes to discover and update structural nodes
  useEffect(() => {
    if (!atomRegistry || !jsomp) return;

    return atomRegistry.subscribeAll((key: string, value: any) => {
      // Discovery & Structure Update Logic: 
      // If the value has structural fields, we track it in dynamicNodes to ensure tree rebuilds
      if (value && typeof value === 'object' && value.type && value.parent) {
        setDynamicNodes(prev => {
          // Check if the structure actually changed or if it's a new discovery
          const existing = prev.get(key);
          if (existing && existing.type === value.type && existing.parent === value.parent) {
            return prev;
          }

          // Check against initial entities
          const isInitial = (entities instanceof Map)
            ? entities.has(key)
            : Array.isArray(entities)
              ? entities.some(e => e.id === key)
              : Object.prototype.hasOwnProperty.call(entities, key);

          if (!isInitial) {
            const newNode = {id: key, ...value};
            return new Map(prev).set(key, newNode);
          }
          return prev;
        });
      }
    });
  }, [atomRegistry, jsomp, entities]);

  // 4. Handle data conversion automatically
  const nodes = useMemo(() => {
    if (!jsomp || !atomRegistry) return [] as IJsompNode[];

    // Supports Map, Array, or Plain Object inputs
    let entityMap: Map<string, any>;
    if (entities instanceof Map) {
      entityMap = new Map(entities);
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

    // Merge in dynamic nodes discovered at runtime
    dynamicNodes.forEach((node, id) => {
      if (!entityMap.has(id)) {
        entityMap.set(id, node);
      }
    });

    // For all nodes in the map, ensure we use the LATEST structure from registry
    // This solves the issue where discovery might have been partial or structure changed
    entityMap.forEach((v, k) => {
      const regVal = atomRegistry.get(k);
      if (regVal && typeof regVal === 'object') {
        if (regVal.type) v.type = regVal.type;
        if (regVal.parent) v.parent = regVal.parent;
      }
    });

    return jsomp.restoreTree(entityMap, rootId, atomRegistry);
  }, [entities, dynamicNodes, rootId, jsomp, atomRegistry]);

  /**
   * 5. Create Layout Manager for the current nodes
   */
  const layout = useMemo(() => {
    if (!jsomp || !nodes || nodes.length === 0) return undefined;
    return jsomp.getLayout(nodes);
  }, [jsomp, nodes]);

  /**
   * 6. Emit render event for system integration (e.g. AI Context)
   */
  useEffect(() => {
    if (nodes && nodes.length > 0 && layout) {
      internalContext.eventBus?.emit('did-render', {
        rootId,
        nodeCount: nodes.length,
        nodes,
        layout
      });
    }
  }, [nodes, layout, rootId]);

  // 7. Mount notification
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
        stylePresets,
        layout
      }}
    />
  );
};
