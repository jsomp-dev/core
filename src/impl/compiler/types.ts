import {IAtomRegistry, IJsompNode, JsompLogger} from '../../types';

/**
 * JSOMP Compiler Pipeline Stages
 */
export enum PipelineStage {
  /**
   * Phase 1: Pre-Process
   * Responsibility: Clean and enhance the raw entity Map.
   * Typical tasks: Inheritance merging, Default props filling.
   */
  PreProcess = 'PreProcess',

  /**
   * Phase 2: Re-Structure
   * Responsibility: Establish node relationships (Parent/Child) and resolve addressing.
   * Typical tasks: Slot tagging, Path calculation, ID resolution.
   */
  ReStructure = 'ReStructure',

  /**
   * Phase 3: Hydrate
   * Responsibility: Transform nodes into final renderable instances and assemble the tree.
   * Typical tasks: Action binding (ActionTags), State atom initialization, Tree splicing.
   */
  Hydrate = 'Hydrate',

  /**
   * Phase 4: Post-Assemble
   * Responsibility: Global tree inspection and final adjustments.
   * Typical tasks: Recursion guarding, global path calculation, cross-reference validation.
   */
  PostAssemble = 'PostAssemble',
}

/**
 * Context flowing through the compiler pipeline
 */
export interface ICompilerContext {
  /** 
   * Flat map of entities being processed (Shared reference)
   * Plugins should treat this as ReadOnly.
   */
  entities: ReadonlyMap<string, any>;

  /** 
   * Overlays for entities if modified during PreProcess 
   * Internal use by the framework to handle immutability.
   */
  entityUpdates?: Map<string, any>;

  /** Current list of processed nodes (populated as the pipeline progresses) */
  nodes: Map<string, IJsompNode>;

  /** 
   * Incremental hints: Only these IDs need to be processed.
   * If missing, fall back to full scanning.
   */
  dirtyIds?: Set<string>;

  /** Root ID for the tree (optional) */
  rootId?: string;

  /** Global or local atom registry (for state hydration) */
  atomRegistry?: IAtomRegistry;

  /** Dynamic options/metadata passed to plugins */
  options: Record<string, any>;

  /** The final assembled tree (if applicable) */
  result?: IJsompNode[];

  /** Logger instance for debugging and error reporting */
  logger: JsompLogger;

  /** Action Registry for semantic interaction resolving */
  actionRegistry?: any; // Use any to avoid circular dependency
}

/**
 * Type of a compiler plugin function
 */
export type JsompPlugin = (context: ICompilerContext) => void | Map<string, any>;

/**
 * Plugin definition with stage affinity
 */
export interface IJsompPluginDef {
  /** Unique identifier for the plugin (allows replacement) */
  id: string;
  stage: PipelineStage;
  name?: string;

  /**
   * Target entity types for this plugin.
   * If present, onNode will only be called for entities with these types.
   */
  targetTypes?: string[];

  /** 
   * [Atom Track] Batch hook (New)
   * Triggered in the Compiler's main loop. Do not perform extra iterations inside.
   * Returns a partial update for the node/entity.
   */
  onNode?: (id: string, entity: any, ctx: ICompilerContext) => void | any;

  /** 
   * [Global Track] Independent processor (Retained)
   * For plugins that need to perceive full data or execute complex logic like recursion.
   * Returns a map of updates if entities were modified.
   */
  handler?: JsompPlugin;
}
