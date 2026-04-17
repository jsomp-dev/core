import {IJsompPluginDef, IJsompService, JsompConfig, PipelineStage} from './types';
import {JsompService} from './JsompService';
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

  // 1.1 Register core feature defaults
  jsompEnv.config.registerDefaults('features', {
    enableCache: config.features?.enableCache ?? true,
    strictMode: config.features?.strictMode ?? false,
    standardPlugins: config.features?.standardPlugins ?? {}
  });
  // 1.1 Register core feature defaults
  jsompEnv.config.registerDefaults('plugins', config.plugins ?? []);

  // 2. Ensure service instance is available in the registry
  if (!jsompEnv.service) {
    jsompEnv.setService(new JsompService());
  }

  const pipeline = jsompEnv.service!.pipeline;

  // 3. Register user provided plugins (if any)
  const plugins = jsompEnv.config.get('plugins', []) as IJsompPluginDef[];
  plugins.forEach(p => {
    if (p.id && p.stage && (p.handler || p.onNode)) {
      pipeline.register(p.id, p.stage, p, p.name);
    }
  });

  // 4. Smart Bootstrapping: Load standard plugins if not registered AND not explicitly disabled
  const standardPlugins: Record<string, boolean> = jsompEnv.config.get('features.standardPlugins', {});

  const shouldRegister = (id: string, stage: PipelineStage) => {
    const isExplicitlyDisabled = standardPlugins[id] === false;
    const isAlreadyRegistered = pipeline.getPlugins(stage).some((p: any) => p.id === id);
    return !isExplicitlyDisabled && !isAlreadyRegistered;
  };

  if (shouldRegister('standard-inherit', PipelineStage.PreProcess)) {
    const {inheritPlugin} = await import('./engine/compiler/plugins/InheritPlugin');
    pipeline.register('standard-inherit', PipelineStage.PreProcess, inheritPlugin, 'StandardInherit');
  }

  if (shouldRegister('standard-id-validation', PipelineStage.PreProcess)) {
    const {idValidationPlugin} = await import('./engine/compiler/plugins/IdValidationPlugin');
    pipeline.register('standard-id-validation', PipelineStage.PreProcess, idValidationPlugin, 'StandardIdValidation');
  }

  if (shouldRegister('standard-operator', PipelineStage.PreProcess)) {
    const {operatorExpressionPlugin} = await import('./engine/compiler/plugins/OperatorExpressionPlugin');
    pipeline.register('standard-operator', PipelineStage.PreProcess, operatorExpressionPlugin, 'StandardOperatorExpression');
  }

  if (shouldRegister('standard-state', PipelineStage.Hydrate)) {
    const {stateHydrationPlugin} = await import('./engine/compiler/plugins/StateHydrationPlugin');
    pipeline.register('standard-state', PipelineStage.Hydrate, stateHydrationPlugin, 'StandardStateHydration');
  }

  if (shouldRegister('standard-attribute-cache', PipelineStage.PreProcess)) {
    const {attributeCachePlugin} = await import('./engine/compiler/plugins/AttributeCachePlugin');
    pipeline.register('standard-attribute-cache', PipelineStage.PreProcess, attributeCachePlugin, 'StandardAttributeCache');
  }

  if (shouldRegister('standard-incremental-discovery', PipelineStage.ReStructure)) {
    const {incrementalDiscoveryPlugin} = await import('./engine/compiler/plugins/IncrementalDiscoveryPlugin');
    pipeline.register('standard-incremental-discovery', PipelineStage.ReStructure, incrementalDiscoveryPlugin, 'StandardIncrementalDiscovery');
  }

  if (shouldRegister('standard-path', PipelineStage.ReStructure)) {
    const {pathResolutionPlugin} = await import('./engine/compiler/plugins/PathResolutionPlugin');
    pipeline.register('standard-path', PipelineStage.ReStructure, pathResolutionPlugin, 'StandardPathResolution');
  }

  if (shouldRegister('standard-tree', PipelineStage.Hydrate)) {
    const {treeAssemblyPlugin} = await import('./engine/compiler/plugins/TreeAssemblyPlugin');
    pipeline.register('standard-tree', PipelineStage.Hydrate, treeAssemblyPlugin, 'StandardTreeAssembly');
  }

  if (shouldRegister('standard-actions', PipelineStage.Hydrate)) {
    const {actionTagsPlugin} = await import('./engine/compiler/plugins/ActionTagsPlugin');
    pipeline.register('standard-actions', PipelineStage.Hydrate, actionTagsPlugin, 'StandardActionTags');
  }

  if (shouldRegister('standard-auto-sync', PipelineStage.Hydrate)) {
    const {autoSyncPlugin} = await import('./engine/compiler/plugins/AutoSyncPlugin');
    pipeline.register('standard-auto-sync', PipelineStage.Hydrate, autoSyncPlugin, 'StandardAutoSync');
  }

  if (shouldRegister('standard-window', PipelineStage.Hydrate)) {
    const {windowPlugin} = await import('./engine/compiler/plugins/WindowPlugin');
    pipeline.register('standard-window', PipelineStage.Hydrate, windowPlugin, 'StandardWindow');
  }

  if (shouldRegister('standard-dependency', PipelineStage.PostAssemble)) {
    const {dependencyPlugin} = await import('./engine/compiler/plugins/DependencyPlugin');
    pipeline.register('standard-dependency', PipelineStage.PostAssemble, dependencyPlugin, 'StandardDependency');
  }

  if (shouldRegister('standard-recursion-guard', PipelineStage.PostAssemble)) {
    const {recursionGuardPlugin} = await import('./engine/compiler/plugins/RecursionGuardPlugin');
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