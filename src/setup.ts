import {JsompConfig, IJsompService} from './types';
import {JsompService} from './impl/JsompService';
import {jsompEnv} from './JsompEnv';

/**
 * Initialize JSOMP with optional configuration.
 * 
 * @param config Configuration options. 
 *               - If 'service' is provided, it registers that instance.
 *               - Otherwise, creates and registers a default JsompService.
 * @returns The configured service instance.
 */
export const setupJsomp = async (config: JsompConfig = {}): Promise<IJsompService> => {
  // 1. Initialize tools in the global registry (Logger, Flattener, etc.)
  await jsompEnv.init(config);

  // 2. Ensure service instance is available in the registry
  if (!jsompEnv.service) {
    jsompEnv.setService(new JsompService());
  }

  const {PipelineRegistry} = await import('./impl/compiler/PipelineRegistry');
  const {PipelineStage} = await import('./impl/compiler/types');

  const pipeline = jsompEnv.service!.pipeline;

  // 3. Register user provided plugins (if any)
  if (config.plugins) {
    config.plugins.forEach(p => {
      if (p.id && p.stage && (p.handler || p.onNode)) {
        pipeline.register(p.id, p.stage, p, p.name);
      }
    });
  }

  // 4. Smart Bootstrapping: Load standard plugins if not registered
  if (!pipeline.getPlugins(PipelineStage.PreProcess).some((p: any) => p.id === 'standard-inherit')) {
    const {inheritPlugin} = await import('./impl/compiler/plugins/InheritPlugin');
    pipeline.register('standard-inherit', PipelineStage.PreProcess, inheritPlugin, 'StandardInherit');
  }

  if (!pipeline.getPlugins(PipelineStage.PreProcess).some((p: any) => p.id === 'standard-state')) {
    const {stateHydrationPlugin} = await import('./impl/compiler/plugins/StateHydrationPlugin');
    pipeline.register('standard-state', PipelineStage.PreProcess, stateHydrationPlugin, 'StandardStateHydration');
  }

  if (!pipeline.getPlugins(PipelineStage.PreProcess).some((p: any) => p.id === 'standard-attribute-cache')) {
    const {attributeCachePlugin} = await import('./impl/compiler/plugins/AttributeCachePlugin');
    pipeline.register('standard-attribute-cache', PipelineStage.PreProcess, attributeCachePlugin, 'StandardAttributeCache');
  }

  if (!pipeline.getPlugins(PipelineStage.ReStructure).some((p: any) => p.id === 'standard-incremental-discovery')) {
    const {incrementalDiscoveryPlugin} = await import('./impl/compiler/plugins/IncrementalDiscoveryPlugin');
    pipeline.register('standard-incremental-discovery', PipelineStage.ReStructure, incrementalDiscoveryPlugin, 'StandardIncrementalDiscovery');
  }

  if (!pipeline.getPlugins(PipelineStage.ReStructure).some((p: any) => p.id === 'standard-path')) {
    const {pathResolutionPlugin} = await import('./impl/compiler/plugins/PathResolutionPlugin');
    pipeline.register('standard-path', PipelineStage.ReStructure, pathResolutionPlugin, 'StandardPathResolution');
  }

  if (!pipeline.getPlugins(PipelineStage.Hydrate).some((p: any) => p.id === 'standard-tree')) {
    const {treeAssemblyPlugin} = await import('./impl/compiler/plugins/TreeAssemblyPlugin');
    pipeline.register('standard-tree', PipelineStage.Hydrate, treeAssemblyPlugin, 'StandardTreeAssembly');
  }

  if (!pipeline.getPlugins(PipelineStage.Hydrate).some((p: any) => p.id === 'standard-actions')) {
    const {actionTagsPlugin} = await import('./impl/compiler/plugins/ActionTagsPlugin');
    pipeline.register('standard-actions', PipelineStage.Hydrate, actionTagsPlugin, 'StandardActionTags');
  }

  if (!pipeline.getPlugins(PipelineStage.Hydrate).some((p: any) => p.id === 'standard-auto-sync')) {
    const {autoSyncPlugin} = await import('./impl/compiler/plugins/AutoSyncPlugin');
    pipeline.register('standard-auto-sync', PipelineStage.Hydrate, autoSyncPlugin, 'StandardAutoSync');
  }

  if (!pipeline.getPlugins(PipelineStage.PostAssemble).some((p: any) => p.id === 'standard-dependency')) {
    const {dependencyPlugin} = await import('./impl/compiler/plugins/DependencyPlugin');
    pipeline.register('standard-dependency', PipelineStage.PostAssemble, dependencyPlugin, 'StandardDependency');
  }

  if (!pipeline.getPlugins(PipelineStage.PostAssemble).some((p: any) => p.id === 'standard-recursion-guard')) {
    const {recursionGuardPlugin} = await import('./impl/compiler/plugins/RecursionGuardPlugin');
    pipeline.register('standard-recursion-guard', PipelineStage.PostAssemble, recursionGuardPlugin, 'StandardRecursionGuard');
  }

  jsompEnv.isSetup = true;

  return jsompEnv.service!;
};

export function requireJsomp() {
  if (!jsompEnv.isSetup) {
    throw new Error(`[JSOMP] Jsomp is not setup. Please call setupJsomp() first.`);
  }
  return jsompEnv.service!;
}