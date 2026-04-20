import {
  IJsompNode,
  VisualDescriptor,
  PipelineContext,
  IAtomRegistry,
  IJsompCompiler,
  IJsompRuntime,
  ISignalCenter,
  TopologySnapshot,
  PerformanceMetrics
} from '../../types';
import {TraitPipeline, styleTrait, contentTrait, slotTrait, propsTrait, mustacheTrait} from '../trait';
import {SignalRegistryAdapter} from './SignalRegistryAdapter';
import {BindingResolver} from '../../state';
import {jsompEnv} from '../../JsompEnv';

/**
 * JSOMP Runtime (JsompRuntime)
 * The core hub of the JSOMP engine, responsible for maintaining logic tree states and coordinating incremental updates between the compiler and the visual pipeline.
 * 
 * @status Stable
 * @scope Public
 * @tags Runtime, Scheduler, Engine, Reactive
 */
export class JsompRuntime implements IJsompRuntime {
  private _topologyMap = new Map<string, IJsompNode>();
  private _entities = new Map<string, any>();
  private _compiler: IJsompCompiler;
  // Reverse Index: Atom Key -> Set<NodeId>
  private _dependencyMap = new Map<string, Set<string>>();

  // Visual Pipeline Integration
  private _pipeline: TraitPipeline;
  private _descriptors = new Map<string, VisualDescriptor>();
  private _pipelineContext: PipelineContext; // Reusable context
  private _lastMetrics?: Partial<PerformanceMetrics>;

  private _version = 0;
  private _pendingNodes = new Set<string>(); // Stores IDs of orphan nodes
  private _dirtyIdsLastRun = new Set<string>();
  private _rootId?: string;

  constructor(compiler?: IJsompCompiler) {
    // Inject or use shared Service compiler
    // Priority: Prop > Global Env
    this._compiler = compiler || jsompEnv.service.compiler;

    // Initialize Pipeline
    this._pipeline = new TraitPipeline();
    // propsTrait copies standard props as early base
    this._pipeline.registerTrait(propsTrait, {priority: 100, name: 'props'});
    this._pipeline.registerTrait(mustacheTrait, {priority: 80, name: 'mustache'});
    this._pipeline.registerTrait(styleTrait, {priority: 10, name: 'style'});
    this._pipeline.registerTrait(contentTrait, {priority: 20, name: 'content'});
    this._pipeline.registerTrait(slotTrait, {priority: 30, name: 'slot'});

    // Initialize generic context
    // SignalRegistryAdapter starts disconnected (no data/version), will connect in 'use' method.
    const registry = new SignalRegistryAdapter().setRuntime(this);
    this._pipelineContext = {
      registry,
      actions: jsompEnv.service.actions,
      cache: new Map(),
      dirtyIds: new Set(),
      resolver: {
        resolve: (content: string) => BindingResolver.resolve(content, registry)
      }
    };
  }

  /**
   * Update pipeline context with external providers (components, stylePresets)
   */
  public updateContext(context: Partial<PipelineContext>): void {
    this._pipelineContext = {
      ...this._pipelineContext,
      ...context
    };
  }

  /**
   * Set an external AtomRegistry as a fallback for Mustache resolution.
   * Also binds the registry to the runtime to trigger updates on change.
   */
  private _isSyncingExternal = false;

  public setRegistryFallback(registry: IAtomRegistry | null): void {
    if (this._pipelineContext.registry instanceof SignalRegistryAdapter) {
      this._pipelineContext.registry.setExternalFallback(registry);
    }

    if (registry) {
      // [FIX] Initial Sync: Connect existing states from the external registry to the local SignalCenter.
      const snapshot = registry.getSnapshot?.();
      if (snapshot && this._signalCenter) {
        Object.entries(snapshot).forEach(([key, value]) => {
          // Sync all initially available keys to internal SignalCenter
          this._signalCenter!.onUpdate(key, value);
        });
      }

      registry.subscribeAll((key: string, value: any) => {
        // 💡 [LOCK] Infinity Loop Guard using re-entrancy lock.
        // If the update originated from within this runtime (via SignalRegistryAdapter.set), ignore it.
        if (this._isSyncingExternal) return;

        // Propagate external changes to internal SignalCenter (even if reference is same due to mutation)
        this._signalCenter?.onUpdate(key, value);
      });
    }
  }

  /**
   * Set the primary root ID to guide the compiler
   */
  public setRootId(id: string | undefined): void {
    if (this._rootId !== id) {
      this._rootId = id;
      // If rootId changes, we might need to reconcile again if we are already setup
      if (id && this._signalCenter) {
        this.reconcile([id]);
      }
    }
  }

  /**
   * Internal bridge for SignalRegistryAdapter to mark sync state
   * @internal
   */
  public _performExternalSync(action: () => void): void {
    this._isSyncingExternal = true;
    try {
      action();
    } finally {
      this._isSyncingExternal = false;
    }
  }

  private _signalCenter?: ISignalCenter;

  /**
   * Bind a SignalCenter to achieve automated recompilation
   */
  public use(signalCenter: ISignalCenter): void {
    this._signalCenter = signalCenter;
    signalCenter.subscribe((dirtyAtomIds) => {
      // Set to collect all affected NODE IDs
      const dirtyNodeIds = new Set<string>();

      dirtyAtomIds.forEach(atomId => {
        // 1. Sync latest values
        const val = signalCenter.get(atomId);
        if (val !== undefined) {
          this._entities.set(atomId, val);
        }

        // 2. Direct Entity Updates (if atomId is a nodeId)
        // We assume anything in _entities is potentially a node or part of one
        if (this._entities.has(atomId)) {
          dirtyNodeIds.add(atomId);
        }

        // 3. Indirect Dependency Updates
        // Check if this atom affects any nodes
        const deps = this._dependencyMap.get(atomId);
        if (deps) {
          deps.forEach(nodeId => dirtyNodeIds.add(nodeId));
        }
      });

      // Proceed with reconciliation using NODE IDs
      this.reconcile(Array.from(dirtyNodeIds));
    });

    // Connect adapter to SignalCenter
    // This automatically enables data access (get) and versioning for the pipeline
    if (this._pipelineContext.registry instanceof SignalRegistryAdapter) {
      this._pipelineContext.registry.connect(signalCenter);
    }
  }

  /**
   * Feed raw data (State Synchronization)
   * 
   * This method treats the input Map as the "Source of Truth" for the current state.
   * It performs a diffing between the new input and the existing internal cache to:
   * 1. Identify removed entities (present in cache but missing in input) -> Mark for Deletion.
   * 2. Identify new or updated entities -> Mark for Reconciliation.
   * 
   * Note: For purely additive or high-frequency incremental updates, use SignalCenter instead.
   */
  public feed(entities: Map<string, any>): void {
    const dirtyIds = new Set<string>();

    // 1. Identify removed entities
    for (const id of this._entities.keys()) {
      if (!entities.has(id)) {
        this._entities.delete(id);
        dirtyIds.add(id);
      }
    }

    // 2. Identify new or updated entities
    entities.forEach((val, key) => {
      const old = this._entities.get(key);
      if (old !== val) {
        this._entities.set(key, val);
        dirtyIds.add(key);
      }
    });

    if (dirtyIds.size > 0) {
      // Trigger incremental reconciliation for affected IDs
      this.reconcile(Array.from(dirtyIds));
    }
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
      metrics: this._lastMetrics,
    };
  }

  /**
   * Core logic for incremental reconciliation
   */
  public reconcile(dirtyIds: string[]): void {
    if (dirtyIds.length === 0) return;

    // Start of reconciliation
    const tStart = performance.now();

    // 1. Prepare incremental context
    const dirtySet = new Set(dirtyIds);
    this._dirtyIdsLastRun = dirtySet;

    // 2. Call Compiler (Stateless Mode)
    // We pass our persistent _topologyMap so the compiler can mutate it in place (or clone if needed)
    // The compiler will return the updated map (same instance if mutated)
    const result = this._compiler.compile(this._entities, {
      dirtyIds: dirtySet,
      rootId: this._rootId,
      onDependency: (nodeId: string, atomKey: string) => {
        let nodeSet = this._dependencyMap.get(atomKey);
        if (!nodeSet) {
          nodeSet = new Set();
          this._dependencyMap.set(atomKey, nodeSet);
        }
        nodeSet.add(nodeId);
      },
      // Pass the runtime's state to the compiler
      nodes: this._topologyMap,
      // Pass the internal registry (connected to SignalCenter) instead of the global one.
      // This ensures that compiler plugins (like AttributeCache/ActionTags) use the correct instance.
      atomRegistry: this._pipelineContext.registry,
      actionRegistry: this._pipelineContext.actions
    });

    // 3. Topology Map is now updated in-place by the stateless compiler but we still execute the sync.
    // Just in case the compiler decided to clone or create a new map.
    this._topologyMap = result.nodes;

    // If new nodes were created (e.g. by MultiMount), 
    // add them to the dirty set to ensure descriptors are created.
    if (result.createdIds) {
      for (const id of result.createdIds) {
        dirtySet.add(id);
      }
    }

    // 4. Validate topology (Circular & Orphan checks)
    // Only validate if structure actually changed or it's a full compile.
    if (!dirtyIds || result.hasStructureChanged) {
      this.validateTopology();
    }

    // 5. Run Visual Pipeline
    const tPipeStart = performance.now();
    this._runPipeline(dirtySet);
    this._propagateRefUpdates(dirtySet);
    const tEnd = performance.now();

    // Record Metrics
    this._lastMetrics = {
      startTime: tStart,
      reconcileMs: tEnd - tStart,
      pipelineMs: tEnd - tPipeStart,
      activeNodes: this._topologyMap.size,
      recursionDepth: 0 // Placeholder
    }

    // 6. Increment version
    this._version++;
  }

  /**
   * Propagate reference changes to ancestors to ensure VDOM traversal
   */
  private _propagateRefUpdates(dirtyIds: Set<string>): void {
    const visited = new Set(dirtyIds);
    let currentBatch = Array.from(dirtyIds);

    while (currentBatch.length > 0) {
      const nextBatch: string[] = [];
      for (const id of currentBatch) {
        const node = this._topologyMap.get(id);
        if (node && node.parent) {
          const parentIds = Array.isArray(node.parent) ? node.parent : [node.parent];
          for (const pId of parentIds) {
            if (!visited.has(pId)) {
              // Clone descriptor to force React update (Change Reference)
              const desc = this._descriptors.get(pId);
              if (desc) {
                this._descriptors.set(pId, {...desc});
              }
              visited.add(pId);
              nextBatch.push(pId);
            }
          }
        }
      }
      currentBatch = nextBatch;
    }
  }

  /**
   * Execute the visual pipeline for all affected nodes
   */
  private _runPipeline(dirtyIds: Set<string>): void {
    // 1. Invalidate pipeline cache for dirty nodes
    this._pipeline.invalidate(Array.from(dirtyIds));

    // 2. Update Context
    this._pipelineContext.dirtyIds = dirtyIds;

    // 3. Incremental Processing: Only process nodes affected by the current change
    // This reduces O(N) traversal to O(K) where K is the number of dirty nodes.
    for (const id of dirtyIds) {
      const node = this._topologyMap.get(id);
      if (node) {
        // Update or Create Descriptor
        const descriptor = this._pipeline.processNode(node, this._pipelineContext);

        // Safety: Ensure parentId is synced. 
        // processNode might return a cached descriptor, so we only update if it changed.
        if (!this.areParentsEqual(descriptor.parentId, node.parent)) {
          descriptor.parentId = node.parent;
        }

        this._descriptors.set(id, descriptor);
      } else {
        // Cleanup descriptors for deleted nodes
        this._descriptors.delete(id);
        // Also ensure they are removed from the pipeline cache
        // (already handled by this._pipeline.invalidate above)
      }
    }
  }

  /**
   * Topology self-healing and validation
   */
  private validateTopology(): void {
    this._pendingNodes.clear();
    const visited = new Set<string>();
    const stack = new Set<string>();

    // Single pass DFS handles both orphans and circularity in O(N)
    for (const node of this._topologyMap.values()) {
      this._dfsValidate(node, visited, stack);
    }
  }

  private _dfsValidate(node: IJsompNode, visited: Set<string>, stack: Set<string>): void {
    if (stack.has(node.id)) {
      console.error(`[JsompRuntime] Circular reference detected at node: ${node.id}`);
      return;
    }
    if (visited.has(node.id)) return;

    visited.add(node.id);
    stack.add(node.id);

    if (node.parent) {
      const parentIds = Array.isArray(node.parent) ? node.parent : [node.parent];
      for (const pId of parentIds) {
        const parent = this._topologyMap.get(pId);
        if (parent) {
          this._dfsValidate(parent, visited, stack);
        } else {
          // Orphan check
          this._pendingNodes.add(node.id);
        }
      }
    }

    stack.delete(node.id);
  }

  private areParentsEqual(p1: any, p2: any): boolean {
    if (Array.isArray(p1) && Array.isArray(p2)) {
      return p1.length === p2.length && p1.every((v, i) => v === p2[i]);
    }
    return p1 === p2;
  }


}
