import {JsompConfig} from './types';
import {internalContext} from './context';
import {JsompService} from './impl/JsompService';

/**
 * Initialize JSOMP with optional configuration
 * This is the only place where cross-module side effects should occur.
 */
export const setup = async (config: JsompConfig = {}): Promise<void> => {
  await internalContext.init(config);

  const {PipelineRegistry} = await import('./impl/compiler/PipelineRegistry');
  const {PipelineStage} = await import('./impl/compiler/types');

  const globalPipeline = PipelineRegistry.global;

  // 1. Register user provided plugins (if any)
  if (config.plugins) {
    config.plugins.forEach(p => {
      if (p.id && p.stage && p.handler) {
        globalPipeline.register(p.id, p.stage, p.handler, p.name);
      }
    });
  }

  // 2. Smart Bootstrapping: Only load standard plugins if they are not already overridden
  // This enables tree-shaking while keeping the runtime API synchronous.
  if (!globalPipeline.getPlugins(PipelineStage.PreProcess).some((p: any) => p.id === 'standard-state')) {
    const {stateHydrationPlugin} = await import('./impl/compiler/plugins/StateHydrationPlugin');
    globalPipeline.register('standard-state', PipelineStage.PreProcess, stateHydrationPlugin, 'StandardStateHydration');
  }

  if (!globalPipeline.getPlugins(PipelineStage.ReStructure).some((p: any) => p.id === 'standard-path')) {
    const {pathResolutionPlugin} = await import('./impl/compiler/plugins/PathResolutionPlugin');
    globalPipeline.register('standard-path', PipelineStage.ReStructure, pathResolutionPlugin, 'StandardPathResolution');
  }

  if (!globalPipeline.getPlugins(PipelineStage.Hydrate).some((p: any) => p.id === 'standard-tree')) {
    const {treeAssemblyPlugin} = await import('./impl/compiler/plugins/TreeAssemblyPlugin');
    globalPipeline.register('standard-tree', PipelineStage.Hydrate, treeAssemblyPlugin, 'StandardTreeAssembly');
  }
};

// Export the context for internal use (should be treated as read-only by business logic)
export {internalContext as context};

/**
 * Default unique service instance
 */
export const jsomp = new JsompService();