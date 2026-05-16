import {Operator} from './operator';

/**
 * JSOMP Node definition (Atomic structure)
 * Follows a flat property strategy to optimize AI recall rates
 */
export interface IJsompNode {
  /** Unique identifier (anchor) */
  id: string;

  /** Component type (mapped to ComponentRegistry) */
  type: string;

  /** Static business properties (from JSON) */
  props?: Record<string, any>;

  /**
   * Style descriptor (Visual Props)
   * Supports combined prefabs, Tailwind arrays and inline CSS
   */
  style_presets?: string[] | Operator | (string | Operator)[];  // e.g. ["btn-base", "btn-primary"]
  style_tw?: string[] | Operator | (string | Operator)[];       // e.g. ["p-4", "bg-red-500"]
  style_css?: Partial<Record<string, string | number | Operator>>; // Inline CSS

  /** Points to the id of the parent container */
  parent?: string | string[] | null;

  /**
   * Slot name (optional)
   * Used when this node is not passed directly as children, but as Props passed to a specific position of the parent component
   */
  slot?: string;

  /**
   * Inheritance reference
   * Points to the id of the parent entity
   */
  inherit?: string | Operator;

  /**
   * Pull an entire node tree from the entity pool into the current position.
   * pull: 'comp-profile'           → pulls all root nodes under the namespace
   * pull: 'comp-profile.container' → pulls a specific root node
   */
  pull?: string;

  /**
   * Modify an existing target node's properties.
   * Transforms the node array into a "node operation sequence":
   * - Default (no modify): additive node creation
   * - With modify: merge, override, or replace existing nodes
   *
   * Target resolution supports path backtracking
   * 
   */
  modify?: IJsompModify;

  /**
   * Controls whether this node is mounted into the render tree.
   * - false: node and its children are removed from the render tree.
   * - true / undefined: normal render behavior.
   * Supports reactive switching: re-feed the entity to toggle mount/unmount.
   */
  mounted?: boolean;

  /** [Runtime injection] Automatically spliced full path ID */
  _fullPath?: string;

  /**
   * Semantic action tags (mapping tag name to event names)
   * @example { "search": ["key:enter", "dom:click", "custom:receive_msg"] }
   */
  actions?: Record<string, string[]>;

  /**
   * Runtime event handlers (spliced by plugins)
   */
  onEvent?: Record<string, Function>;

  /**
   * Whether this node needs its physical instance (DOM/Object) to be reported back to the service.
   * Default is false.
   */
  trackInstance?: boolean;
}

/**
 * Inject mapping table (Key is the complete path)
 */
export type IInjectionMap = Record<string, Partial<IJsompNode> | {onEvent?: Record<string, Function>}>;

/**
 * Visual Descriptor (Phase 2 Deliverable)
 * The output of the TraitPipeline processing.
 * Represents the final, framework-agnostic description of a UI element.
 */
export interface VisualDescriptor {
  /** Unique identifier */
  id: string;
  /** Final path for reactive resolution (V2) */
  path?: string;
  /** Component type name (from registry) */
  componentType: string;
  /** Final props after trait processing */
  props: Record<string, any>;
  /** Final styles after trait processing */
  styles: Record<string, any>;
  /** Slot distribution table: key=slotName, value=childIds */
  slots: Record<string, string[]>;
  /** Parent ID to identify roots. Supports multiple parents for Multi-Mount. */
  parentId?: string | string[] | null;
  /**
   * Pre-compiled EventBus subscriptions.
   * Populated by PropsTrait for custom namespace events.
   * Activated by the renderer when the component mounts.
   */
  subscriptions?: import('./events').SubscriptionEntry[];
  /**
   * Whether this node needs its physical instance to be reported back.
   */
  trackInstance?: boolean;
}

/**
 * JSOMP Hierarchy Node (Topology map for AI)
 */
export interface JsompHierarchyNode {
  id: string;
  type: string;
  path?: string;
  slot?: string;
  children?: JsompHierarchyNode[];
}

/**
 * Options for hierarchy generation
 */
export interface JsompHierarchyOptions {
  /** Whether to include the full path in the output. Defaults to false. */
  includePath?: boolean;
}

/**
 * Modify descriptor for the modify field.
 * Allows a node to act as an "operation" that modifies an existing target node.
 */
export interface IJsompModify {
  /**
   * Target node path.
   * Supports path backtracking
   */
  target: string;

  /**
   * Modification mode:
   * - 'feed':     Deep merge. Objects are shallow-merged, arrays are unioned.
   *               Like "feeding" data into the existing entity.
   * - 'override': Overwrite. Same-level fields from the modify node replace
   *               those on the target. Does NOT merge with existing data.
   * - 'replace':  Complete replacement. The target node is fully replaced
   *               by the modify node's data (except id).
   */
  mode: 'feed' | 'override' | 'replace';

  /**
   * Allow modification of dangerous (protected) fields for this operation.
   * Dangerous fields include: 'id', 'type', 'parent', 'inherit', 'pull', 'modify'
   * and internal runtime fields.
   * By default, these fields cannot be modified. This array opts in specific
   * fields for this single modify operation.
   */
  allowDangerousFields?: string[];
}
