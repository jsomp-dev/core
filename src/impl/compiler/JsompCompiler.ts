import {IAtomRegistry, IJsompNode} from '../../types';
import {PipelineRegistry} from './PipelineRegistry';
import {ICompilerContext, IJsompPluginDef, PipelineStage} from './types';
import {jsompEnv} from "../../JsompEnv";

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
}

/**
 * JSOMP Compiler
 * Orchestrates the pipeline stages and runs registered plugins.
 */
export class JsompCompiler {
  private localRegistry: PipelineRegistry;
  private nodes: Map<string, IJsompNode> = new Map();

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
   * Access the internal node store
   */
  public get nodesMap(): Map<string, IJsompNode> {
    return this.nodes;
  }

  /**
   * Run the compilation pipeline on a flat entity map
   */
  public compile(
    entities: Map<string, any>,
    options: Partial<CompilerOptions> = {}
  ): IJsompNode[] {
    // 1. Cleanup removed nodes if not in incremental mode
    if (!options.dirtyIds) {
      for (const id of this.nodes.keys()) {
        if (!entities.has(id)) {
          this.nodes.delete(id);
        }
      }
    }

    const ctx: ICompilerContext = {
      entities, // established memory sharing
      nodes: this.nodes, // persistent store
      dirtyIds: options.dirtyIds,
      rootId: options.rootId,
      atomRegistry: options.atomRegistry,
      actionRegistry: options.actionRegistry,
      options: {},
      logger: jsompEnv.logger
    };

    // Execute stages sequentially
    this.runStage(PipelineStage.PreProcess, ctx);
    this.runStage(PipelineStage.ReStructure, ctx);
    this.runStage(PipelineStage.Hydrate, ctx);
    this.runStage(PipelineStage.PostAssemble, ctx);

    // Final result extraction (The last stage should have assembled the tree or populated nodes)
    return this.extractResult(ctx);
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

      const processed = new Set<string>();
      const queue = [...targetIds];

      let head = 0;
      while (head < queue.length) {
        const id = queue[head++];
        if (processed.has(id)) continue;
        processed.add(id);

        const rawEntity = ctx.entities.get(id);
        if (!rawEntity) continue;

        // Resolve entity with local updates (Inherited props etc.)
        const entityUpdate = ctx.entityUpdates?.get(id);
        const entity = entityUpdate ? {...rawEntity, ...entityUpdate} : rawEntity;

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
      // Fallback for when no assembly plugin was used
      if (!node.parent || (node.parent === 'root' && !ctx.nodes.has('root')) || node.id === ctx.rootId) {
        result.push(node);
      }
    });

    return result;
  }
}