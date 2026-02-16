import {IAtomRegistry, IJsompNode} from '../../types';
import {internalContext as context} from '../../context';
import {PipelineRegistry} from './PipelineRegistry';
import {ICompilerContext, IJsompPluginDef, PipelineStage} from './types';

export interface CompilerOptions {
  plugins?: IJsompPluginDef[];
  rootId?: string;
  atomRegistry?: IAtomRegistry;
}

/**
 * JSOMP Compiler
 * Orchestrates the pipeline stages and runs registered plugins.
 */
export class JsompCompiler {
  private localRegistry: PipelineRegistry;

  constructor(options: CompilerOptions = {}) {
    // Merge global plugins with local overrides
    this.localRegistry = PipelineRegistry.global.clone();
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
  ): IJsompNode[] {
    const ctx: ICompilerContext = {
      entities: new Map(entities), // Clone to prevent side effects in plugins
      nodes: new Map(),
      rootId: options.rootId,
      atomRegistry: options.atomRegistry,
      options: {},
      logger: context.logger // Use the global context logger as default
    };

    // Execute stages sequentially
    this.runStage(PipelineStage.PreProcess, ctx);
    this.runStage(PipelineStage.ReStructure, ctx);
    this.runStage(PipelineStage.Hydrate, ctx);

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

    // 2. Batch execution: One pass for N plugins
    if (batchPlugins.length > 0) {
      ctx.entities.forEach((entity, id) => {
        for (const plugin of batchPlugins) {
          try {
            plugin.onNode!(id, entity, ctx);
          } catch (err: any) {
            ctx.logger.error(`[Compiler][${stage}][Batch] Plugin ${plugin.name || 'anonymous'} failed on node ${id}: ${err.message}`, err);
          }
        }
      });
    }

    // 3. Global execution: Traditional sequential execution
    for (const plugin of globalPlugins) {
      try {
        plugin.handler!(ctx);
      } catch (err: any) {
        ctx.logger.error(`[Compiler][${stage}][Global] Plugin ${plugin.name || 'anonymous'} failed: ${err.message}`, err);
        throw err;
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
      if (!node.parent || node.parent === 'root' || node.id === ctx.rootId) {
        result.push(node);
      }
    });

    return result;
  }
}