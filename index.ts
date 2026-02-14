export * from './types';
export * from './events';
export {setup, jsomp, context} from './setup';

// Export common implementation classes for advanced usage
export {JsompService} from './impl/JsompService';
export {AtomRegistry} from './impl/core/AtomRegistry';
export {JsompAtom} from './impl/core/JsompAtom';
export {ComponentRegistry} from './impl/registry/ComponentRegistry';

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
  JsompConfig,
  JsompLogger,
  JsompFlattener,
  JsompEventBus,
} from './types';

// Export JsompPage Component
export {JsompPage} from './component/JsompPage';
export type {JsompPageProps} from './component/JsompPage';

// Export Hooks
export * from './hook';

// Export Standard Presets (HTML)
export * from './presets';
