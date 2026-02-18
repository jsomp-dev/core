import {IJsompNode, VisualDescriptor} from '../types';

/**
 * TopologySnapshot - Phase 1 Deliverable
 */
export interface TopologySnapshot {
  /** Topology version, auto-incremented on each change */
  version: number;
  /** Flat snapshot of all current logic tree nodes */
  allNodes: IJsompNode[];
  /** Flat snapshot of visual descriptors (Phase 2) */
  descriptors?: VisualDescriptor[];
  /** Set of dirty node IDs involved in this change (for downstream incremental computation) */
  dirtyIds: Set<string>;
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
