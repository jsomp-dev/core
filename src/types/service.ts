import {IComponentRegistry} from './component';
import {IAtomRegistry, ISchemaRegistry, IJsompAtom, IStateDispatcherRegistry} from './state';
import {IPipelineRegistry, ITraitPipeline, IJsompCompiler} from './compiler';
import {IActionRegistry} from './action';
import {IJsompStream, StreamOptions} from './stream';
import {IJsompLayoutManager} from './layout';
import {IJsompNode} from './node';

/**
 * JSOMP Service Interface
 * Central orchestration for all JSOMP capabilities.
 */
export interface IJsompService {
  /**
   * Runtime environment (Logger, EventBus, etc.)
   */
  readonly env: IJsompEnv;

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
   * Global trait pipeline for visual processing
   */
  readonly traitPipeline: ITraitPipeline;

  /**
   * Schema Registry for typed atoms
   */
  readonly schemas: ISchemaRegistry;

  /**
   * Action Registry for semantic interaction
   */
  readonly actions: IActionRegistry;

  /**
   * Create a new atomic state managed by this service
   */
  createAtom<T>(initialValue: T, schema?: any): IJsompAtom<T>;

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
   * The primary compiler instance shared across the service.
   * Most users should use this instead of creating new instances.
   */
  readonly compiler: IJsompCompiler;

  /**
   * Create a new compiler instance with all registered plugins (Advanced)
   */
  createCompiler(options?: any): IJsompCompiler;

  /**
   * Get layout manager for a given set of entities.
   * Internal implementation should use WeakMap for caching.
   */
  getLayout(entities: IJsompNode[]): IJsompLayoutManager;
  /**
   * Reset the service state, clearing the global registry and other caches.
   */
  reset(): void;
}

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
 * JSOMP Event Bus Interface
 */
export interface JsompEventBus {
  on(event: string, handler: (payload: any) => void): () => void;
  emit(event: string, payload: any): void;
}

/**
 * JSOMP Flattener Interface (Core algorithm for tree manipulation)
 */
export interface JsompFlattener {
  unflatten<T = any>(entities: Map<string, IJsompNode>, rootId?: string, childrenField?: string): T[];
  flatten<T extends IJsompNode = IJsompNode>(root: any, idField?: string, childrenField?: string): Map<string, T>;
}

/**
 * JSOMP Runtime Environment
 * Holds the core dependencies and configuration
 */
export interface IJsompEnv {
  readonly logger: JsompLogger;
  readonly flattener: JsompFlattener;
  readonly eventBus?: JsompEventBus;
  /** Initialize the environment with explicit config (async) */
  init(config: JsompConfig): Promise<void>;
}

/**
 * JSOMP Configuration
 */
export interface JsompConfig {
  /** Optional custom service instance to use/initialize */
  service?: IJsompService;
  logger?: JsompLogger;
  flattener?: JsompFlattener;
  eventBus?: JsompEventBus;
  /** Custom compiler plugins */
  plugins?: any[];
}
