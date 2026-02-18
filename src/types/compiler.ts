import {IJsompNode, VisualDescriptor} from './node';
import {IAtomRegistry} from './state';
import {IComponentRegistry} from './component';
import {IActionRegistry} from './action';
import {JsompLogger} from "./service";

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
 * JSOMP Compiler Interface
 * Contract for both standard and custom compiler implementations.
 */
export interface IJsompCompiler {
  /** Access the internal logic node store */
  readonly nodesMap: Map<string, IJsompNode>;

  /** 
   * Run the compilation pipeline to transform raw entities into logic nodes.
   * Returns the root nodes of the assembled tree.
   */
  compile(entities: Map<string, any>, options?: any): IJsompNode[];

  /** 
   * Register a plugin to the compiler.
   */
  use(id: string, stage: PipelineStage, handler: any, name?: string): this;
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

  /** Callback for dependency collection */
  onDependency?: (nodeId: string, atomKey: string) => void;

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

/**
 * Pipeline Registry Interface
 */
export interface IPipelineRegistry {
  register(id: string, stage: any, handler: any, name?: string): void;
  unregister(id: string): void;
  getPlugins(stage: any): any[];
}

/**
 * Pipeline Context
 * The environment passed through the pipeline traits.
 */
export interface PipelineContext {
  /** Global atom registry */
  registry: IAtomRegistry;
  /** Global action registry */
  actions?: IActionRegistry;
  /** Component registry */
  components?: IComponentRegistry;

  /** 
   * Multi-level cache storage
   * Structure: Map<TraitName, Map<CacheKey, CacheValue>>
   */
  cache: Map<string, Map<string, any>>;

  /** Set of dirty atom IDs (or node IDs) that need reprocessing */
  dirtyIds?: Set<string>;

  /** Mustache resolver helper */
  resolver?: {
    resolve(content: string, context?: any): any;
  };

  /** Current recursion depth (for DepthGuard) */
  depth?: number;

  /** Style presets map (name -> classNames) */
  stylePresets?: Record<string, string[]>;
}

/**
 * Trait Processor Function Signature
 * Designed to be pure and side-effect free on the input node.
 * Modifies the descriptor in place.
 */
export type TraitProcessor = (
  node: IJsompNode,
  descriptor: VisualDescriptor,
  context: PipelineContext
) => void;

/**
 * Trait Registration Option
 */
export interface TraitOption {
  priority: number; // Higher runs first
  name: string;
}

/**
 * Interface for the TraitPipeline class.
 * Defines the public API for processing nodes and managing descriptors.
 */
export interface ITraitPipeline {
  /**
   * Register a trait processor with specific options.
   * @param processor - The trait processor function.
   * @param options - The options for the trait processor.
   */
  registerTrait(processor: TraitProcessor, options: TraitOption): void;

  /**
   * Process a node and produce a VisualDescriptor.
   * Handles caching, recursion depth check, and trait execution.
   * @param node - The input node to process.
   * @param context - The pipeline context.
   * @returns The resulting VisualDescriptor.
   */
  processNode(node: IJsompNode, context: PipelineContext): VisualDescriptor;

  /**
   * Explicitly invalidate cache for specific IDs.
   * @param ids - An array of node IDs to invalidate.
   */
  invalidate(ids: string[]): void;

  /**
   * Clear the entire cache.
   */
  clearCache(): void;

  /**
   * Get a descriptor from cache directly.
   * @param id - The ID of the node whose descriptor is requested.
   * @returns The cached VisualDescriptor or undefined if not found.
   */
  getDescriptor(id: string): VisualDescriptor | undefined;
}

// --- Legacy Internal Trait Types ---

/**
 * Visual Trait: Represents the visual expression of a node (CSS/Classes)
 */
export interface IVisualTrait {
  className: string;
  style: Record<string, any>;
}

/**
 * Interaction Trait: Represents the interactive expression of a node (Events/Actions)
 */
export interface IInteractionTrait {
  /** Combined event handlers (Action Registry + Injection + Static) */
  events: Record<string, Function>;
}

/**
 * State Trait: Represents the reactive state expression of a node (Mustache/Injection)
 */
export interface IStateTrait {
  /** The final node after injection and mustache resolution */
  resolvedNode: IJsompNode;
  /** Normalized path of the node */
  path: string;
  /** Original raw injection applied to this node */
  injection: any;
}

/**
 * Assembly Trait: Represents the final unified props ready for the component.
 */
export interface IAssemblyTrait {
  /** The final assembled props object */
  props: any;
}

/**
 * Content Trait: Represents the final resolved children of the node.
 */
export interface IContentTrait {
  /** The final React children nodes */
  children: any;
}
