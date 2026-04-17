import {IAtomRegistry, ICompilerContext, IJsompCompiler, IJsompNode, IJsompPluginDef, IEntityRegistry, PipelineStage} from '../../types';
import {PipelineRegistry} from './PipelineRegistry';
import {jsompEnv} from "../../JsompEnv";

export interface CreateCompilerOptions extends CompilerOptions {
  compilerConstructor?: new (options: CompilerOptions) => IJsompCompiler;
}

export interface CompilerOptions {
  pipeline?: PipelineRegistry;
  plugins?: IJsompPluginDef[];
  rootId?: string;
  atomRegistry?: IAtomRegistry;
  actionRegistry?: any;
  /** 
   * Incremental hints: Only these IDs need to be processed.
   * If missing, fall back to full scanning.
   */
  dirtyIds?: Set<string>;

  /** Callback for dependency collection (V2) */
  onDependency?: (nodeId: string, atomKey: string) => void;

  /** 
   * [Stateless] External persistent node map.
   * If provided, compiler will operate on this map (mutate).
   * If not, a new map is created.
   */
  nodes?: Map<string, IJsompNode>;

  /**
   * Entity pool for resolving external templates and fragments.
   */
  entityPool?: IEntityRegistry;
}

/**
 * JSOMP Compiler (JsompCompiler)
 * The core compilation engine responsible for coordinating pipeline stages and running registered plugins. It processes flat entity maps and generates the final UI node tree through a series of transformation stages.
 * 
 * @status Stable
 * @scope Public
 * @tags Compiler, Core, Engine
 */
export class JsompCompiler implements IJsompCompiler {
  private localRegistry: PipelineRegistry;

  constructor(options: CompilerOptions = {}) {
    // 1. Priority: Use a specific pre-cloned pipeline registry from the service
    if (options.pipeline) {
      this.localRegistry = options.pipeline;
    } else {
      // Fallback: Clone global for ad-hoc compiler instances
      this.localRegistry = PipelineRegistry.global.clone();
    }

    // 2. Local overrides for this specific compiler
    if (options.plugins) {
      options.plugins.forEach(p => this.localRegistry.register(p.id, p.stage, p, p.name));
    }
  }

  /**
   * Run the compilation pipeline on a flat entity map
   */
  public compile(
    entities: Map<string, any>,
    options: Partial<CompilerOptions> = {}
  ): {roots: IJsompNode[]; nodes: Map<string, IJsompNode>} {
    // Determine working node storage (Externally provided or Fresh)
    const nodes = options.nodes || new Map<string, IJsompNode>();

    // 1. Cleanup removed nodes if not in incremental mode
    if (!options.dirtyIds) {
      for (const id of nodes.keys()) {
        if (!entities.has(id)) {
          nodes.delete(id);
        }
      }
    }

    const ctx: ICompilerContext = {
      entities, // established memory sharing
      nodes: nodes, // persistent store (passed in)
      dirtyIds: options.dirtyIds,
      rootId: options.rootId,
      atomRegistry: options.atomRegistry,
      actionRegistry: options.actionRegistry,
      entityPool: options.entityPool || jsompEnv.service?.entities,
      onDependency: options.onDependency,
      options: {},
      logger: jsompEnv.logger,
      isUiNode: (entity: any): entity is IJsompNode => {
        return entity && typeof entity === 'object' && !Array.isArray(entity) && 'type' in entity && entity.type !== 'state';
      }
    };

    // Execute stages sequentially
    this.runStage(PipelineStage.PreProcess, ctx);
    this.runStage(PipelineStage.ReStructure, ctx);
    this.runStage(PipelineStage.Hydrate, ctx);
    this.runStage(PipelineStage.PostAssemble, ctx);

    // Final result extraction (The last stage should have assembled the tree or populated nodes)
    return {
      roots: this.extractResult(ctx),
      nodes: ctx.nodes
    };
  }

  /**
   * Register a plugin to this specific compiler instance
   */
  public use(id: string, stage: PipelineStage, handler: any, name?: string): this {
    this.localRegistry.register(id, stage, handler, name);
    return this;
  }

  private runStage(stage: PipelineStage, ctx: ICompilerContext): void {
    const plugins = this.localRegistry.getPlugins(stage);

    // 1. Classification: batch (with onNode) versus global (with handler)
    const batchPlugins = plugins.filter(p => !!p.onNode);
    const globalPlugins = plugins.filter(p => !!p.handler);

    // 2. Global execution (Pre-stage logic like Inheritance or Registry setup)
    for (const plugin of globalPlugins) {
      try {
        const updates = plugin.handler!(ctx);
        if (updates instanceof Map) {
          ctx.entityUpdates = ctx.entityUpdates || new Map();
          updates.forEach((val, key) => ctx.entityUpdates!.set(key, val));
        }
      } catch (err: any) {
        ctx.logger.error(`[Compiler][${stage}][Global] Plugin ${plugin.name || 'anonymous'} failed: ${err.message}`, err);
        throw err;
      }
    }

    // 3. Batch execution: One pass for N plugins
    if (batchPlugins.length > 0) {
      const isIncremental = !!ctx.dirtyIds;
      const targetIds = isIncremental ? Array.from(ctx.dirtyIds!) : Array.from(ctx.entities.keys());

      // --- ROOT PULLING LOGIC ---
      // If rootId is specified but not in local entities, pull it from the pool if available
      if (ctx.rootId && !ctx.entities.has(ctx.rootId) && ctx.entityPool?.get(ctx.rootId)) {
        if (!targetIds.includes(ctx.rootId)) {
          targetIds.push(ctx.rootId);
        }
      }

      const processed = new Set<string>();
      const queue = [...targetIds];

      let head = 0;
      while (head < queue.length) {
        const id = queue[head++];
        if (processed.has(id)) continue;
        processed.add(id);

        const rawEntity = ctx.entities.get(id);

        // --- POOL DISCOVERY LOGIC ---
        // If entity is missing in local map, try resolving from the global entity pool
        let discoveryResult = rawEntity;
        if (ctx.entityPool?.get(id)) {
          if (discoveryResult) {
            // Conflict Detection
            ctx.logger.warn(`[Compiler] ID conflict detected: Local entity "${id}" is overriding an entity in the global pool.`);
          } else {
            discoveryResult = ctx.entityPool.get(id);
          }
        }

        if (!discoveryResult) continue;

        // Resolve entity with local updates (Inherited props etc.)
        const entityUpdate = ctx.entityUpdates?.get(id);
        const entity = entityUpdate ? {...discoveryResult, ...entityUpdate} : discoveryResult;

        // Keep track of old parent for incremental impact analysis
        const oldParent = ctx.nodes.get(id)?.parent;

        for (const plugin of batchPlugins) {
          // Core performance barrier: declarative type filtering
          if (plugin.targetTypes && !plugin.targetTypes.includes(entity.type)) continue;

          try {
            const result = plugin.onNode!(id, entity, ctx);

            // 💡 Handle return values for automated merging
            if (result && typeof result === 'object') {
              if (stage === PipelineStage.PreProcess) {
                ctx.entityUpdates = ctx.entityUpdates || new Map();
                ctx.entityUpdates.set(id, {...ctx.entityUpdates.get(id), ...result});
              } else {
                const existingNode = ctx.nodes.get(id);
                if (existingNode) {
                  ctx.nodes.set(id, {...existingNode, ...result});
                }
              }
            }
          } catch (err: any) {
            ctx.logger.error(`[Compiler][${stage}][Batch] Plugin ${plugin.name || 'anonymous'} failed on node ${id}: ${err.message}`, err);
            throw err;
          }
        }

        // --- POOL CHILD DISCOVERY ---
        // If we are processing a node, all its children in the pool must also be processed
        if (ctx.entityPool) {
          const pooledChildren = ctx.entityPool.getChildren(id);
          for (const childNode of pooledChildren) {
            if (!processed.has(childNode.id)) {
              queue.push(childNode.id);
              if (isIncremental && ctx.dirtyIds) {
                ctx.dirtyIds.add(childNode.id);
              }
            }
          }
        }

        // 4. Reference tracing: If the parent changes,
        // the affected parent node will automatically be temporarily added to the dirty list
        const newParent = ctx.nodes.get(id)?.parent;
        if (isIncremental && newParent !== oldParent) {
          if (oldParent && !processed.has(oldParent)) {
            queue.push(oldParent);
            if (ctx.dirtyIds) ctx.dirtyIds.add(oldParent);
          }
          if (newParent && !processed.has(newParent)) {
            queue.push(newParent);
            if (ctx.dirtyIds) ctx.dirtyIds.add(newParent);
          }
        }
      }
    }
  }

  /**
   * Extract the final tree from the context
   * By default, it looks for nodes that have no parents or matching the rootId
   */
  private extractResult(ctx: ICompilerContext): IJsompNode[] {
    if (ctx.result) {
      return ctx.result;
    }

    const result: IJsompNode[] = [];
    ctx.nodes.forEach(node => {
      // 1. Only extract UI nodes (exclude state nodes etc.)
      if (!ctx.isUiNode(node)) return;

      // 2. Identify roots: no parent, dead parent reference, or explicit rootId
      if (!node.parent || (node.parent === 'root' && !ctx.nodes.has('root')) || node.id === ctx.rootId) {
        result.push(node);
      }
    });

    return result;
  }
}