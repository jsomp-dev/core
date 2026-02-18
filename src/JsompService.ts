import {
  IAtomRegistry,
  IComponentRegistry,
  IJsompAtom,
  IJsompCompiler,
  IJsompLayoutManager,
  IJsompNode,
  IJsompService,
  IJsompStream,
  IStateDispatcherRegistry,
  ITraitPipeline,
  StreamOptions
} from './types';
import {
  AtomRegistry,
  ExternalStateRegistry,
  JsompAtom,
  ObjectAdapter,
  StateDispatcherRegistry,
  ZustandAdapter
} from './state';
import {JsompStream} from './misc/JsompStream';
import {ActionRegistry, ComponentRegistry, SchemaRegistry} from './registry';
import {CreateCompilerOptions, JsompCompiler, PipelineRegistry, TraitPipeline} from './engine';
import {JsompLayoutManager} from './misc/JsompLayoutManager';
import {jsompEnv} from './JsompEnv';

/**
 * JSOMP Service Implementation
 */
export class JsompService implements IJsompService {

  private _layoutMap: WeakMap<IJsompNode[], IJsompLayoutManager> = new WeakMap();

  /**
   * Runtime environment
   */
  public get env() {
    return jsompEnv;
  }

  /**
   * Component registry
   */
  public readonly componentRegistry: IComponentRegistry = new ComponentRegistry();

  /**
   * Global state registry
   * Business layers should inject long-term shared state here.
   */
  public readonly globalRegistry: IAtomRegistry;

  /**
   * Schema Registry for typed atoms
   */
  public readonly schemas: SchemaRegistry;

  /**
   * Action Registry for semantic interaction
   */
  public readonly actions = new ActionRegistry();

  /**
   * Compiler pipeline registry
   */
  public readonly pipeline: PipelineRegistry;

  /**
   * Trait Pipeline
   */
  public readonly traitPipeline: ITraitPipeline;

  constructor() {
    this.globalRegistry = new AtomRegistry();
    this.pipeline = PipelineRegistry.global.clone();
    this.traitPipeline = new TraitPipeline();
    this.schemas = SchemaRegistry.global;
  }

  /**
   * State adapter factories
   */
  public readonly adapters = {
    zustand: (store: any) => new ExternalStateRegistry(new ZustandAdapter(store)),
    object: (store: any) => new ExternalStateRegistry(new ObjectAdapter(store))
  };

  /**
   * Create a local state scope with parent association
   * Recommended to be called when each independent page/large component is instantiated.
   */
  public createScope(): IAtomRegistry {
    return new AtomRegistry(this.globalRegistry);
  }

  /**
   * Create a new atomic state managed by this service
   */
  public createAtom<T>(initialValue: T, schema?: any): IJsompAtom<T> {
    return new JsompAtom(initialValue, schema);
  }

  /**
   * Create a dispatcher registry for mixing multiple state sources.
   * Prefix usage example: "external://zustand/user.name"
   */
  public createStateDispatcher(defaultRegistry?: IAtomRegistry): IStateDispatcherRegistry {
    return new StateDispatcherRegistry(defaultRegistry || this.globalRegistry);
  }

  /**
   * Create a stream controller for handling AI streaming output
   */
  public createStream(options: StreamOptions = {}): IJsompStream {
    return new JsompStream({
      atomRegistry: this.globalRegistry, // Use global by default
      ...options
    });
  }

  private _compiler?: IJsompCompiler;

  /**
   * The primary compiler instance shared across the service.
   */
  public get compiler(): IJsompCompiler {
    if (!this._compiler) {
      this._compiler = this.createCompiler();
    }
    return this._compiler;
  }

  /**
   * Inject a custom compiler instance to be used as the primary compiler.
   */
  public setCompiler(compiler: IJsompCompiler) {
    this._compiler = compiler;
  }

  /**
   * Create a new compiler instance with all registered plugins (Advanced).
   * Supports passing a custom compilerConstructor that implements IJsompCompiler.
   */
  public createCompiler(options?: CreateCompilerOptions): IJsompCompiler {
    const CompilerClass = options?.compilerConstructor ?? JsompCompiler;
    return new CompilerClass({
      pipeline: this.pipeline,
      actionRegistry: this.actions,
      ...options
    });
  }

  /**
   * Get layout manager for a given set of entities.
   * Uses WeakMap for caching.
   */
  public getLayout(entities: IJsompNode[]): IJsompLayoutManager {
    if (this._layoutMap.has(entities)) {
      return this._layoutMap.get(entities)!;
    }
    const manager = new JsompLayoutManager(entities);
    this._layoutMap.set(entities, manager);
    return manager;
  }
}
