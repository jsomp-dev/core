export * from './types';
export * from './events';
export {setup, jsomp, context} from './setup';

// Export common implementation classes for advanced usage
export {JsompService} from './impl/JsompService';
export {AtomRegistry} from './impl/core/AtomRegistry';
export {JsompAtom} from './impl/core/JsompAtom';
export {JsompStream} from './impl/core/JsompStream';
export {ComponentRegistry} from './impl/provider/ComponentRegistry';
export * from './impl/compiler/types';
export * from './impl/compiler/JsompCompiler';
export * from './impl/compiler/JsompDecompiler';

// State Management Implementations (Registries & Adapters)
export {
  StateDispatcherRegistry,
  ExternalStateRegistry,
  ZustandAdapter,
  ObjectAdapter
} from './impl/state';

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
} from './types';

// Export JsompPage Component
export {JsompPage} from './component/JsompPage';
export type {JsompPageProps} from './component/JsompPage';

// Export Hooks
export * from './hook';

// Export Standard Presets (HTML)
export * from './presets';
