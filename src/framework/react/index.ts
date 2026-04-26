/**
 * React Adapter Package
 * This package contains all React-specific implementations for JSOMP.
 * It includes the ReactFrameworkAdapter for event mapping and ReactRenderer
 * for component rendering.
 */

// Export React-specific renderer components
export * from './ReactRenderer';
export * from './ReactRuntimeAdapter';
export * from './ReactDomRenderer';
export * from './hooks';
export * from './components';

export {createReactFrameworkAdapter, ReactFrameworkAdapter} from './ReactFrameworkAdapter';
