
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
  style_presets?: string[];  // e.g. ["btn-base", "btn-primary"]
  style_tw?: string[];       // e.g. ["p-4", "bg-red-500"]
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
  subscribe(callback: () => void): () => void;
  set(newValue: T): void;
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
 * JSOMP service interface
 */
export interface IJsompService {
  /**
   * Component registration center
   */
  componentRegistry: IComponentRegistry;

  /**
   * Global state registry (single instance, shared across containers)
   */
  globalRegistry: IAtomRegistry;

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
}
