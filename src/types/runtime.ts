import {IJsompNode, VisualDescriptor} from './node';
import {IAtomRegistry} from './state';
import {IComponentRegistry} from './component';
import {IActionRegistry} from './action';
import {IJsompLayoutManager} from './layout';

/**
 * Performance Metrics Structure
 */
export interface PerformanceMetrics {
  /** Timestamp when reconciliation started (t1 - performance.now()) */
  startTime: number;
  /** Kernel Reconcile time (ms) */
  reconcileMs: number;
  /** Rendering Pipeline processing time (ms) */
  pipelineMs: number;
  /** Time from React trigger to DOM update completion (ms) */
  renderMs: number;
  /** Total active nodes in this render */
  activeNodes: number;
  /** Maximum recursion depth detected in this render */
  recursionDepth: number;
}

/**
 * TopologySnapshot
 */
export interface TopologySnapshot {
  /** Topology version, auto-incremented on each change */
  version: number;
  /** Flat snapshot of all current logic tree nodes */
  allNodes: IJsompNode[];
  /** Flat snapshot of visual descriptors */
  descriptors?: VisualDescriptor[];
  /** Set of dirty node IDs involved in this change (for downstream incremental computation) */
  dirtyIds: Set<string>;
  /** Performance metrics for this snapshot generation */
  metrics?: Partial<PerformanceMetrics>;
}

/**
 * SignalCenter Interface
 */
export interface ISignalCenter {
  /** Register a synchronous listener (only emits dirty IDs) */
  subscribe(callback: (dirtyIds: string[]) => void): () => void;
  /** State change notification */
  onUpdate(id: string, newValue: any): void;
  /** Access the buffered/latest value */
  get(id: string): any;
  /** Get the version of a specific atom (incremented on update) */
  getVersion(id: string): number;
}

/**
 * JsompRuntime (Stateful Scheduler) Interface
 */
export interface IJsompRuntime {
  /** Listen to SignalCenter for automated recompilation */
  use(signalCenter: ISignalCenter): void;
  /** Feed full/incremental raw data */
  feed(entities: Map<string, any>): void;
  /** Get current topology snapshot */
  getSnapshot(): TopologySnapshot;
  /** Internal reconciliation logic */
  reconcile(dirtyIds: string[]): void;
  /** Optional: Fallback registry for state lookup */
  setRegistryFallback?(registry: IAtomRegistry): void;
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
  /** Premade style mapping table (mapping semantic names to class names or config) */
  stylePresets?: Record<string, string | string[] | {tw?: string[], css?: Record<string, string | number>}>;
  /** Path prefix (automatically maintained during recursion) */
  pathStack?: string[];
  /** 
   * Layout Manager
   * Allows components to resolve full paths and hierarchy
   */
  layout?: IJsompLayoutManager;
}
