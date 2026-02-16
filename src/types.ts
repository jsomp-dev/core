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
 * Atomic state object interface (Observer)
 */
export interface IJsompAtom<T = any> {
  value: T;
  schema?: ZodType | any; // Storage for Zod or other validators
  subscribe(callback: () => void): () => void;
  set(newValue: T): void;
  /** Execute manual validation and return result */
  validate?(value: any): {success: boolean; error?: any};
}

/**
 * Atomic state value type
 */
export type IAtomValue = Partial<IJsompNode> & {
  onEvent?: Record<string, Function>;
  value?: any; // Used for simple value binding, e.g. {{isLoading}}
  [key: string]: any;
};

/**
 * Atomic state registry interface
 */
export interface IAtomRegistry {
  get(key: string): IJsompAtom | IAtomValue | undefined;
  set(key: string, value: IJsompAtom | IAtomValue | undefined): void;
  batchSet(updates: Record<string, IJsompAtom | IAtomValue | undefined>): void;
  subscribe(key: string, callback: () => void): () => void;
  subscribeAll(callback: (key: string, value: any) => void): () => void;

  // --- Dispatcher Extensions ---
  mount?(namespace: string, registry: IAtomRegistry): void;
  use?(registry: IAtomRegistry): void;
}

/**
 * Component property description (for TOON compression)
 */
export interface IComponentProp {
  name: string;
  type: string;
  desc?: string;
  def?: any;
}

/**
 * Component metadata
 */
export interface IComponentMeta {
  desc?: string;
  props?: IComponentProp[];
  events?: string[];
  slots?: string[];
}

/**
 * Component registry interface
 */
export interface IComponentRegistry {
  /** Register components and their metadata */
  register(name: string, component: any, meta?: IComponentMeta): void;

  /** Get runtime components */
  get(name: string): any | undefined;

  /** Get component metadata */
  getMeta(name: string): IComponentMeta | undefined;

  /** Export Manifest */
  getManifest(): Record<string, IComponentMeta>;
}

/**
 * Dispatcher Registry Interface
 * Extends AtomRegistry with multi-store orchestration capabilities.
 */
export interface IStateDispatcherRegistry extends IAtomRegistry {
  /**
   * Mount a registry to a specific namespace (Plan A)
   */
  mount(namespace: string, registry: IAtomRegistry): this;

  /**
   * Register an ambient fallback registry (Plan B)
   */
  use(registry: IAtomRegistry): this;
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
 * Global Schema Registry for Atoms
 */
export interface ISchemaRegistry {
  /** Global validation toggle */
  enabled: boolean;
  /** Register a schema for a specific ID or Type */
  register(key: string, schema: ZodType | any): void;
  /** Get a schema by ID or Type */
  get(key: string): ZodType | any | undefined;
  /** Export all registered schemas metadata */
  getManifest(): Record<string, any>;
}

/**
 * Action Definition (Schema + Handler)
 */
export interface IActionDef {
  /** Environmental requirements (Atoms, Props, Event Params) */
  require?: {
    /** Alias mapping for atom access: { "localName": "actual.atom.path" } */
    atoms?: Record<string, string>;
    /** Property requirements (with Zod or simple string keys) */
    props?: Record<string, any>;
    /** Event parameter expectations */
    eventParams?: Record<string, any>;
  };
  /** Logic execution body */
  handler: (env: {
    /** Resolved atoms (mapped via aliases) */
    atoms: Record<string, any>;
    /** Original node props */
    props: Record<string, any>;
    /** Payload from the triggered event */
    event: any;
  }) => void | Promise<void>;
}

/**
 * Action Registry Interface
 */
export interface IActionRegistry {
  /**
   * Register a semantic action
   * @param name Action tag name
   * @param def Action definition object or shorthand handler function
   */
  register(
    name: string,
    def: IActionDef | ((env: {
      atoms: Record<string, any>;
      props: Record<string, any>;
      event: any
    }) => void | Promise<void>)
  ): void;

  /** Get an action definition by name */
  getDefinition(name: string): IActionDef | undefined;
}

/**
 * JSOMP Plugin/Module Interface
 */
export interface IJsompService {
  /**
   * Component registry (Public for plugins to register presets)
   */
  readonly componentRegistry: IComponentRegistry;

  /**
   * Global state registry
   */
  readonly globalRegistry: IAtomRegistry;

  /**
   * Global compiler pipeline registry
   */
  readonly pipeline: IPipelineRegistry;

  /**
   * Schema Registry for typed atoms
   */
  readonly schemas: ISchemaRegistry;

  /**
   * Action Registry for semantic interaction
   */
  readonly actions: IActionRegistry;

  /**
   * Restore flat entity Map to JSOMP Tree
   */
  restoreTree(entities: Map<string, any>, rootId?: string, atomRegistry?: IAtomRegistry): IJsompNode[];

  /**
   * Flatten JSOMP Tree into storage format
   */
  flattenTree(nodes: IJsompNode[]): Map<string, any>;

  /**
   * Create a local state scope with parent association
   */
  createScope(): IAtomRegistry;

  /**
   * Create a dispatcher registry for mixing multiple state sources.
   * Supports Namespace mapping and Ambient fallback.
   */
  createStateDispatcher(defaultRegistry?: IAtomRegistry): IStateDispatcherRegistry;

  /**
   * State adapter factories (for external state synergy)
   */
  adapters: {
    zustand(store: any): IAtomRegistry;
    object(store: any): IAtomRegistry;
  };

  /**
   * Create a stream controller for handling AI streaming output
   */
  createStream(options?: StreamOptions): IJsompStream;

  /**
   * Create a new compiler instance
   */
  createCompiler(options?: any): any;

  /**
   * Use a specific compiler instance as the default engine
   */
  useCompiler(compiler: any): void;

  /**
   * Force refresh the internal compiler (e.g. after dynamic plugin registration)
   */
  refreshCompiler(): void;

  /**
   * Get layout manager for a given set of entities.
   * Internal implementation should use WeakMap for caching.
   */
  getLayout(entities: IJsompNode[]): IJsompLayoutManager;
}

/**
 * Rendering Context
 */
export interface IJsompRenderContext {
  /**
   * [Reactive] Atomic state registry
   * Replace the original injections object and provide fine-grained update capabilities
   */
  atomRegistry: IAtomRegistry;
  /**
   * Named binding context (Scope)
   * Store named atoms or constants referenced by {{key}}
   */
  scope?: Record<string, any>;
  /**
   * Component mapping table
   * If passed in, it will take precedence over ComponentRegistry for matching
   */
  components?: Record<string, any>;
  /**
   * Component registration center
   */
  componentRegistry?: IComponentRegistry;
  /** Premade style mapping table (mapping semantic names to class name arrays) */
  stylePresets?: Record<string, string[]>;
  /** Path prefix (automatically maintained during recursion) */
  pathStack?: string[];
  /** 
   * [NEW] Layout Manager
   * Allows components to resolve full paths and hierarchy
   */
  layout?: IJsompLayoutManager;
}

// --- New Refactoring Types ---

/**
 * JSOMP Logger Interface
 */
export interface JsompLogger {
  info(msg: string, ...args: any[]): void;
  warn(msg: string, ...args: any[]): void;
  error(msg: string, ...args: any[]): void;
  debug(msg: string, ...args: any[]): void;
  /**
   * Throw error with code and message
   */
  throw(code: any | string | number, message: string, context?: any): never;
  /**
   * Throw existing error object
   */
  throw(error: Error): never;
}

/**
 * JSOMP Flattener Interface (Core algorithm for tree manipulation)
 */
export interface JsompFlattener {
  unflatten<T = any>(entities: Map<string, IJsompNode>, rootId?: string, childrenField?: string): T[];
  flatten<T extends IJsompNode = IJsompNode>(root: any, idField?: string, childrenField?: string): Map<string, T>;
}



/**
 * JSOMP Event Bus Interface
 */
export interface JsompEventBus {
  on(event: string, handler: (payload: any) => void): () => void;
  emit(event: string, payload: any): void;
}

/**
 * JSOMP Configuration
 */
export interface JsompConfig {
  logger?: JsompLogger;
  flattener?: JsompFlattener;
  eventBus?: JsompEventBus;
  /** Custom compiler plugins for the global pipeline */
  plugins?: any[]; // Using any[] for now to avoid circular dependency in types.ts
}

/**
 * State adapter interface
 * Used to shield differences between various state libraries
 */
export interface IStateAdapter {
  /** 
   * Path-based value acquisition
   * Support lodash.get style depth path analysis 
   */
  getValue(path: string): any;

  /** 
   * [Optional] Perform status update
   * If Store is read-only, this method can be not implemented
   */
  setValue?(path: string, val: any): void;

  /** 
   * Path-based subscription logic
   * Ensure only the target Path or its sub-path change triggers callback
   */
  subscribe(path: string, callback: () => void): () => void;

  /**
   * [Optional] Subscribe to all changes in the store
   */
  subscribeAll?(callback: (path: string, value: any) => void): () => void;
}

/**
 * Stream transformation plugin: used for TOON decoding, decompression, etc.
 */
export interface IStreamTransformer {
  /**
   * Process input chunk (string or Uint8Array)
   * Should return a JSON string fragment (it can be incomplete)
   */
  transform(chunk: any, context?: any): string;
}

/**
 * JSOMP Stream configuration options
 */
export interface StreamOptions {
  /** Plugin chain, e.g., [new ToonDecoder()] */
  plugins?: IStreamTransformer[];
  /** Whether to enable automatic repair/completion (default: true) */
  autoRepair?: boolean;
  /** Callback triggered when a data patch is produced */
  onPatch?: (patch: any) => void;
  /** Callback triggered when the stream ends (and the final data is flushed) */
  onFinish?: (finalData: any) => void;
  /** Atomic state registry to automatically apply patches to */
  atomRegistry?: IAtomRegistry;
}

/**
 * JSOMP Stream controller interface
 */
export interface IJsompStream {
  /** Push a data chunk into the stream */
  write(chunk: any): void;
  /** End the stream and process all remaining data */
  end(): void;
  /** Explicitly reset the stream state */
  reset(): void;
}

/**
 * JSOMP Hierarchy Node (Topology map for AI)
 */
export interface JsompHierarchyNode {
  id: string;
  type: string;
  path: string;
  slot?: string;
  children?: JsompHierarchyNode[];
}

/** @internal Helper to force TS to resolve/prettify mapped types for IDE IntelliSense */
type _ResolvePath<T> = {[K in keyof T]: T[K]} & {};

/** @internal Internal recursive node for PathProxy */
type _RecursivePathNode<Nodes extends readonly IJsompNode[], Node extends IJsompNode> = {
  /** Returns the final dot-joined path string */
  $: string;
} & {
  [K in Nodes[number]as K extends {parent: Node['id']} ? K['id'] : never]: _RecursivePathNode<Nodes, K>;
};

/**
 * Type-safe path chain proxy
 * Supports recursive inference from 'as const' layout arrays.
 */
export type PathProxy<T> = T extends readonly IJsompNode[]
  ? _ResolvePath<{
    [K in T[number]as K extends {parent: string} ? never : K['id']]: _RecursivePathNode<T, K>;
  }>
  : any;

/**
 * LayoutManager interface
 */
export interface IJsompLayoutManager<TId extends string = string, TLayout extends readonly IJsompNode[] = any> {
  /** Get all nodes matching the ID, each with its calculated _fullPath */
  getNodes(id: TId): Array<IJsompNode & {_fullPath: string}>;
  /** Calculates the full path of a specific node */
  getNodePath(node: IJsompNode): string;
  /** Get all valid full paths in the layout */
  getAllPaths(): string[];
  /** Get the topological hierarchy tree */
  getHierarchy(): JsompHierarchyNode;
  /** Type-safe path chain proxy */
  readonly path: PathProxy<TLayout>;
}
