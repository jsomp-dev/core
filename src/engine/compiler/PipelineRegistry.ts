import {IJsompPluginDef, PipelineStage} from '../../types';

/**
 * Registry for managing compiler plugins
 * Supports global registration (for libraries) and local registration (for specific compiler instances)
 */
export class PipelineRegistry {
  private plugins: Map<PipelineStage, IJsompPluginDef[]> = new Map();

  constructor() {
    Object.values(PipelineStage).forEach(stage => {
      this.plugins.set(stage as PipelineStage, []);
    });
  }

  /**
   * Register a plugin at a specific stage.
   * If a plugin with the same ID already exists, it will be replaced.
   */
  public register(id: string, stage: PipelineStage, plugin: any, name?: string): void {
    const list = this.plugins.get(stage);
    if (list) {
      const existingIdx = list.findIndex(p => p.id === id);

      // Handle both legacy function-based and new object-based registration
      const pluginDef: IJsompPluginDef = typeof plugin === 'function'
        ? {id, stage, handler: plugin, name: name || id}
        : {id, stage, ...plugin, name: name || id};

      if (existingIdx > -1) {
        list[existingIdx] = pluginDef;
      } else {
        list.push(pluginDef);
      }
    }
  }

  /**
   * Unregister a plugin by ID
   */
  public unregister(id: string): void {
    this.plugins.forEach((list) => {
      const idx = list.findIndex(p => p.id === id);
      if (idx > -1) {
        list.splice(idx, 1);
      }
    });
  }

  /**
   * Get all registered plugins for a stage
   */
  public getPlugins(stage: PipelineStage): IJsompPluginDef[] {
    return this.plugins.get(stage) || [];
  }

  /**
   * Clone the current registry (useful for creating localized registries based on global ones)
   */
  public clone(): PipelineRegistry {
    const newRegistry = new PipelineRegistry();
    this.plugins.forEach((list, stage) => {
      newRegistry.plugins.get(stage)?.push(...list);
    });
    return newRegistry;
  }
  /**
   * Internal global singleton for the default pipeline
   */
  public static readonly global = new PipelineRegistry();
}
