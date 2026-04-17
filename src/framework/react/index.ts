/**
 * React Adapter Package
 * This package contains all React-specific implementations for JSOMP.
 * It includes the ReactFrameworkAdapter for event mapping and ReactRenderer
 * for component rendering.
 */

import {reactFrameworkManifest} from './ReactFrameworkAdapter';
import {jsompEnv} from '../../JsompEnv';

// Register the React framework manifest immediately when this module is imported.
// This enables tree-shaking: if you don't import this module, React adapter
// won't be bundled. Import from '@jsomp/core/react' to use React.
jsompEnv.frameworkLoader.registerBuiltInFramework(reactFrameworkManifest);

// Export React-specific renderer components
export * from './ReactRenderer';
export * from './ReactRuntimeAdapter';
export * from './ReactDomRenderer';
export * from './hooks';
export * from './components';

