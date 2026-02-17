import {
  IJsompService, IJsompNode, IAtomRegistry, IComponentRegistry, IStateDispatcherRegistry,
  IJsompStream, StreamOptions, IJsompLayoutManager
} from '../types';
import {AtomRegistry} from './core/AtomRegistry';
import {JsompStream} from './core/JsompStream';
import {ComponentRegistry} from './provider/ComponentRegistry';
import {ExternalStateRegistry, ObjectAdapter, StateDispatcherRegistry, ZustandAdapter} from './state';
import {JsompCompiler, CompilerOptions} from './compiler/JsompCompiler';
import {PipelineRegistry} from './compiler/PipelineRegistry';
import {JsompDecompiler} from './compiler/JsompDecompiler';
import {SchemaRegistry} from './core/SchemaRegistry';
import {ActionRegistry} from './provider/ActionRegistry';
import {JsompLayoutManager} from './core/JsompLayoutManager';
import {jsompEnv} from '../JsompEnv';
import {JsompAtom} from './core/JsompAtom';
import {IJsompAtom} from '../types';


/**
 * JSOMP Service Implementation
 */
export class JsompService implements IJsompService {
  private _compiler: JsompCompiler | null = null;
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

  constructor() {
    this.globalRegistry = new AtomRegistry();
    this.pipeline = PipelineRegistry.global.clone();
    this.schemas = SchemaRegistry.global; // TODO: Support schema cloning if needed
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
   * Restore tree structure from flat Map
   */
  public restoreTree(entities: Map<string, any>, rootId?: string, atomRegistry?: IAtomRegistry): IJsompNode[] {
    if (!this._compiler) {
      // Clones the global registry which was populated by setup()
      this._compiler = this.createCompiler();
    }
    return this._compiler.compile(entities, {
      rootId,
      atomRegistry,
      actionRegistry: this.actions
    });
  }

  /**
   * Flatten tree structure into flat Map
   */
  public flattenTree(nodes: IJsompNode[]): Map<string, any> {
    return JsompDecompiler.flatten(nodes);
  }

  /**
   * Force refresh the internal compiler (e.g. after dynamic plugin registration)
   */
  public refreshCompiler(): void {
    this._compiler = null;
  }

  /**
   * Create a new compiler instance
   */
  public createCompiler(options?: CompilerOptions): JsompCompiler {
    return new JsompCompiler({
      pipeline: this.pipeline,
      actionRegistry: this.actions,
      ...options
    });
  }

  /**
   * Use a specific compiler instance as the default engine
   */
  public useCompiler(compiler: JsompCompiler): void {
    this._compiler = compiler;
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
