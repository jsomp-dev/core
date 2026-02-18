export * from './types';
export * from './events';
export {setupJsomp} from './setup';

// Export environment and core service
export {JsompEnv, jsompEnv} from './JsompEnv';

export {JsompService} from './JsompService';
export {AtomRegistry} from './state/AtomRegistry';
export {JsompAtom} from './state/JsompAtom';
export {JsompStream} from './misc/JsompStream';
export {BindingResolver} from './state/BindingResolver';
export {ComponentRegistry} from './registry/ComponentRegistry';
export {JsompLayoutManager, createLayoutManager} from './misc/JsompLayoutManager';
export * from './engine/compiler/JsompCompiler';
export * from './engine/compiler/JsompDecompiler';

// State Management Implementations (Registries & Adapters)
export {
  StateDispatcherRegistry,
  ExternalStateRegistry,
  ZustandAdapter,
  ObjectAdapter
} from './state';

// Re-export core types explicitly for convenience
export type {
  IJsompService,
  IAtomRegistry,
  IJsompAtom,
  IAtomValue,
  IComponentMeta,
  IComponentRegistry,
  IJsompNode,
  IJsompRenderContext,
  IStateAdapter,
  IStateDispatcherRegistry,
  JsompConfig,
  JsompLogger,
  JsompFlattener,
  JsompEventBus,
  IJsompStream,
  IStreamTransformer,
  StreamOptions,
  IActionDef,
  IActionRegistry,
  IJsompLayoutManager,
  JsompHierarchyNode,
  PathProxy
} from './types';

// Export JsompPage Component
export {JsompPage} from './component/JsompPage';
export type {JsompPageProps} from './component/JsompPage';

// Export Hooks
export * from './hook';

// Export Standard Presets (HTML)
export * from './presets';

// Export Trait Pipeline
export * from './engine/trait';
export type {
  VisualDescriptor,
  PipelineContext,
  TraitProcessor,
  TraitOption
} from './types';
