import {IAtomRegistry, IJsompNode} from '../../types';

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
   * Typical tasks: Action binding, State atom initialization, Tree splicing.
   */
  Hydrate = 'Hydrate',
}

/**
 * Context flowing through the compiler pipeline
 */
export interface ICompilerContext {
  /** Flat map of entities being processed */
  entities: Map<string, any>;

  /** Current list of processed nodes (populated as the pipeline progresses) */
  nodes: Map<string, IJsompNode>;

  /** Root ID for the tree (optional) */
  rootId?: string;

  /** Global or local atom registry (for state hydration) */
  atomRegistry?: IAtomRegistry;

  /** Dynamic options/metadata passed to plugins */
  options: Record<string, any>;

  /** The final assembled tree (if applicable) */
  result?: IJsompNode[];
}

/**
 * Type of a compiler plugin function
 */
export type JsompPlugin = (context: ICompilerContext) => void;

/**
 * Plugin definition with stage affinity
 */
export interface IJsompPluginDef {
  /** Unique identifier for the plugin (allows replacement) */
  id: string;
  stage: PipelineStage;
  handler: JsompPlugin;
  name?: string;
}
