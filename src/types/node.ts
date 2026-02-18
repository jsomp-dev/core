import type {ZodType} from 'zod';

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
  style_presets?: readonly string[];  // e.g. ["btn-base", "btn-primary"]
  style_tw?: readonly string[];       // e.g. ["p-4", "bg-red-500"]
  style_css?: Record<string, string | number>; // Inline CSS

  /** Points to the id of the parent container */
  parent?: string | null;

  /**
   * Slot name (optional)
   * Used when this node is not passed directly as children, but as Props passed to a specific position of the parent component
   */
  slot?: string;

  /** [Runtime injection] Automatically spliced full path ID */
  _fullPath?: string;

  /**
   * Semantic action tags (mapping tag name to event names)
   * @example { "search": ["onEnter", "onIconClick"] }
   */
  actions?: Record<string, string[]>;

  /**
   * Runtime event handlers (spliced by plugins)
   */
  onEvent?: Record<string, Function>;
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
  /** Component type name (from registry) */
  componentType: string;
  /** Final props after trait processing */
  props: Record<string, any>;
  /** Final styles after trait processing */
  styles: Record<string, any>;
  /** Slot distribution table: key=slotName, value=childIds */
  slots: Record<string, string[]>;
  /** Parent ID to identify roots */
  parentId?: string | null;
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
