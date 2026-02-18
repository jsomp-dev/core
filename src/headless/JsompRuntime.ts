import {IJsompNode} from '../types';
import {JsompCompiler} from '../impl/compiler/JsompCompiler';
import {IJsompRuntime, ISignalCenter, TopologySnapshot} from './types';

/**
 * JsompRuntime (Stateful Scheduler)
 * Responsibility: Maintain the logic tree state and schedule resources (e.g., Compiler) for incremental updates.
 */
export class JsompRuntime implements IJsompRuntime {
  private _topologyMap = new Map<string, IJsompNode>();
  private _entities = new Map<string, any>();
  private _compiler: JsompCompiler;
  private _version = 0;
  private _pendingNodes = new Set<string>(); // Stores IDs of orphan nodes
  private _dirtyIdsLastRun = new Set<string>();

  constructor(compiler?: JsompCompiler) {
    // Inject or create a stateless Compiler
    this._compiler = compiler || new JsompCompiler();
  }

  /**
   * Bind a SignalCenter to achieve automated recompilation
   */
  public use(signalCenter: ISignalCenter): void {
    signalCenter.subscribe((dirtyIds) => {
      // Sync latest values from SignalCenter to local entities cache
      dirtyIds.forEach(id => {
        const val = signalCenter.get(id);
        if (val !== undefined) {
          this._entities.set(id, val);
        }
      });
      // Proceed with reconciliation
      this.reconcile(dirtyIds);
    });
  }

  /**
   * Feed raw data
   * Initial load or large snapshot updates
   */
  public feed(entities: Map<string, any>): void {
    // Merge entity data into cache
    entities.forEach((val, key) => {
      this._entities.set(key, val);
    });

    // Trigger full initial compilation
    this.reconcile(Array.from(entities.keys()));
  }

  /**
   * Get the current topology snapshot
   */
  public getSnapshot(): TopologySnapshot {
    return {
      version: this._version,
      allNodes: Array.from(this._topologyMap.values()),
      dirtyIds: new Set(this._dirtyIdsLastRun),
    };
  }

  /**
   * Core logic for incremental reconciliation
   */
  public reconcile(dirtyIds: string[]): void {
    if (dirtyIds.length === 0) return;

    // 1. Prepare incremental context
    const dirtySet = new Set(dirtyIds);
    this._dirtyIdsLastRun = dirtySet;

    // 2. Call Compiler
    // JsompCompiler.compile will update its internal this.nodes store
    this._compiler.compile(this._entities, {dirtyIds: dirtySet});

    // Get the internal node mapping from the compiler
    const compilerNodes = this._compiler.nodesMap;

    // 3. Sync Compiler nodes into Runtime topologyCache
    // Only process dirty IDs to ensure reference updates
    dirtySet.forEach(id => {
      const node = compilerNodes.get(id);
      if (node) {
        this._topologyMap.set(id, node);
      } else {
        this._topologyMap.delete(id);
      }
    });

    // 4. Validate topology (Circular & Orphan checks)
    this.validateTopology();

    // 5. Increment version
    this._version++;
  }

  /**
   * Topology self-healing and validation
   */
  private validateTopology(): void {
    this._pendingNodes.clear();

    for (const [id, node] of this._topologyMap) {
      if (node.parent) {
        // Orphan check
        if (!this._topologyMap.has(node.parent)) {
          this._pendingNodes.add(id);
        }

        // Circular reference detection (Simple path tracing)
        if (this.isCircular(node)) {
          console.error(`[JsompRuntime] Circular reference detected at node: ${id}`);
        }
      }
    }
  }

  /**
   * Simple circular detection
   */
  private isCircular(startNode: IJsompNode): boolean {
    const visited = new Set<string>();
    let current: IJsompNode | undefined = startNode;

    while (current && current.parent) {
      if (visited.has(current.id)) return true;
      visited.add(current.id);
      current = this._topologyMap.get(current.parent);

      // Recursive depth limit to avoid infinite loops in extreme cases
      if (visited.size > 2000) return true;
    }
    return false;
  }
}
