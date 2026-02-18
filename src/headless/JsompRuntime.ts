import {IJsompNode, VisualDescriptor, PipelineContext} from '../types';
import {JsompCompiler} from '../impl/compiler/JsompCompiler';
import {TraitPipeline, styleTrait, contentTrait, slotTrait} from '../impl/pipeline'; // Import pipeline
import {IJsompRuntime, ISignalCenter, TopologySnapshot} from './types';
import {SignalRegistryAdapter} from './SignalRegistryAdapter';

/**
 * JsompRuntime (Stateful Scheduler)
 * Responsibility: Maintain the logic tree state and schedule resources (e.g., Compiler) for incremental updates.
 */
export class JsompRuntime implements IJsompRuntime {
  private _topologyMap = new Map<string, IJsompNode>();
  private _entities = new Map<string, any>();
  private _compiler: JsompCompiler;

  // Visual Pipeline Integration
  private _pipeline: TraitPipeline;
  private _descriptors = new Map<string, VisualDescriptor>();
  private _pipelineContext: PipelineContext; // Reusable context

  private _version = 0;
  private _pendingNodes = new Set<string>(); // Stores IDs of orphan nodes
  private _dirtyIdsLastRun = new Set<string>();

  constructor(compiler?: JsompCompiler) {
    // Inject or create a stateless Compiler
    this._compiler = compiler || new JsompCompiler();

    // Initialize Pipeline
    this._pipeline = new TraitPipeline();
    this._pipeline.registerTrait(styleTrait, {priority: 10, name: 'style'});
    this._pipeline.registerTrait(contentTrait, {priority: 20, name: 'content'});
    this._pipeline.registerTrait(slotTrait, {priority: 30, name: 'slot'});

    // Initialize generic context
    // SignalRegistryAdapter starts disconnected (no data/version), will connect in 'use' method.
    this._pipelineContext = {
      registry: new SignalRegistryAdapter(),
      cache: new Map(),
      dirtyIds: new Set()
    };
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

    // Connect adapter to SignalCenter
    // This automatically enables data access (get) and versioning for the pipeline
    if (this._pipelineContext.registry instanceof SignalRegistryAdapter) {
      this._pipelineContext.registry.connect(signalCenter);
    }
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
      descriptors: Array.from(this._descriptors.values()), // Export Visual Descriptors
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


    // 5. Run Visual Pipeline
    this._runPipeline(dirtySet);

    // 6. Increment version
    this._version++;
  }

  /**
   * Execute the visual pipeline for all affected nodes
   */
  private _runPipeline(dirtyIds: Set<string>): void {
    // Invalidate pipeline cache for dirty nodes
    // Convert Set to Array for invalidation
    this._pipeline.invalidate(Array.from(dirtyIds));

    // Update Context
    this._pipelineContext.dirtyIds = dirtyIds;

    // Re-process all nodes (Pipeline handles caching internally)
    // We iterate over the entire map to ensure the snapshot descriptors are complete.
    // Non-dirty nodes will be efficiently retrieved from the cache.
    for (const [id, node] of this._topologyMap) {
      // Process node through pipeline
      const descriptor = this._pipeline.processNode(node, this._pipelineContext);
      this._descriptors.set(id, descriptor);
    }
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
