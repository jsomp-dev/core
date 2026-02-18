import {IJsompNode, VisualDescriptor} from '../types';

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
}
