/**
 * React Framework Adapter Implementation
 * Maps neutral JSOMP event concepts to React-specific property names
 * and wraps event handlers with React-compatible logic.
 */

import type {
  FrameworkManifest,
  IFrameworkAdapter,
  IJsompRuntime,
  IRenderContext,
  IRenderer,
  IRuntimeAdapter
} from '../../types';
import {KeyboardUtils} from '../../utils/keyboard';
import {ReactRuntimeAdapter} from './ReactRuntimeAdapter';
import {ISignalCenter} from 'dist';
import {ReactDomRenderer} from './ReactDomRenderer';
import {jsompEnv} from '../../JsompEnv';

/**
 * React framework manifest declaration.
 * This manifest is used by the FrameworkLoader to register the React adapter.
 */
export const reactFrameworkManifest: FrameworkManifest = {
  id: 'react',
  name: 'React',
  peerDependencies: {
    'react': '>=18.0.0 || >=19.0.0',
    'react-dom': '>=18.0.0 || >=19.0.0'
  },
  priority: 100,
  factory: async () => new ReactFrameworkAdapter()
};

/**
 * React-specific framework adapter.
 * Handles event name mapping from neutral JSOMP format to React's
 * camelCase onXxx format, and provides keyboard event wrapping logic.
 */
export class ReactFrameworkAdapter implements IFrameworkAdapter {
  /** Manifest reference for this adapter */
  public readonly manifest = reactFrameworkManifest;
  /** Render adapter map for this adapter */
  private readonly reactRuntimeAdapterMap = new Map<string, IRuntimeAdapter>();

  /** Shortcut accessor for manifest.id */
  public readonly target = 'react';

  /**
   * Determines if this framework owns the given namespace.
   * React handles 'dom' (DOM events) and 'key' (keyboard events).
   * @param namespace - The namespace to check (e.g., 'dom', 'key', 'native')
   * @returns true if React handles this namespace
   */
  public isOwner(namespace: string): boolean {
    return namespace === 'dom' || namespace === 'key';
  }

  /**
   * Maps a neutral event name to a React-specific property name.
   * Examples:
   *   - 'double_click' -> 'onDoubleClick'
   *   - 'click' -> 'onClick'
   *   - 'key:Enter' (conceptually, though namespace handles that)
   * @param namespace - The event namespace (e.g., 'dom', 'key')
   * @param eventName - The neutral event name (e.g., 'double_click')
   * @returns React property name (e.g., 'onDoubleClick')
   */
  public mapPropName(namespace: string, eventName: string): string {
    if (namespace === 'key') {
      return 'onKeyDown';
    }

    // Normalize to lowercase for processing
    let normalizedName = eventName.toLowerCase();

    // Remove 'on' prefix if mistakenly included (e.g., 'onclick' -> 'click')
    if (normalizedName.startsWith('on')) {
      normalizedName = normalizedName.substring(2);
    }

    // Support legacy/shorthand aliases for double-click
    if (normalizedName === 'doubleclick' || normalizedName === 'dblclick') {
      normalizedName = 'double_click';
    }

    // Convert snake_case to PascalCase (e.g., double_click -> DoubleClick)
    const pascalName = normalizedName
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

    return `on${pascalName}`;
  }

  /**
   * Wraps an event handler with React-compatible logic.
   * For keyboard events, adds shortcut matching and event consumption.
   * @param namespace - The event namespace
   * @param eventName - The event name being handled
   * @param original - The original handler function
   * @returns Wrapped handler with framework-specific logic
   */
  public wrapHandler(namespace: string, eventName: string, original: Function): Function {
    if (namespace === 'key') {
      // Keyboard events need shortcut matching and event consumption
      return (e: KeyboardEvent) => {
        if (KeyboardUtils.isMatch(e, eventName)) {
          // Consume the event to prevent default browser behavior
          if (typeof e.preventDefault === 'function') {
            e.preventDefault();
            e.stopPropagation();
          }
          // Execute the original handler
          original(e);
        }
      };
    }
    // For other events, return handler unchanged
    return original;
  }

  public createRuntimeAdapter(
    id: string,
    runtime: IJsompRuntime,
    signalCenter: ISignalCenter,
    _options?: any
  ): IRuntimeAdapter {
    // Create and store the runtime adapter
    const reactRuntimeAdapter = new ReactRuntimeAdapter(runtime, signalCenter);
    this.reactRuntimeAdapterMap.set(id, reactRuntimeAdapter);

    // Bind this adapter to the instance registry to enable smart proxy commands
    jsompEnv.service.instances.setAdapter(reactRuntimeAdapter);

    return reactRuntimeAdapter;
  }

  public getRenderer(): IRenderer {
    return ReactDomRenderer;
  }

  public getRenderContext(id: string): IRenderContext {
    // Retrieve the runtime adapter from the map
    const reactRuntimeAdapter = this.reactRuntimeAdapterMap.get(id);
    if (!reactRuntimeAdapter) {
      throw new Error(`[ReactFrameworkAdapter] getRenderContext() failed: React runtime adapter not found for view ${id}`);
    }
    // Return the render context
    return reactRuntimeAdapter.currentContext;
  }
}

/**
 * Factory function to create a ReactFrameworkAdapter instance.
 * Used by the manifest factory pattern for lazy initialization.
 * @returns A new ReactFrameworkAdapter instance
 */
export function createReactFrameworkAdapter(): IFrameworkAdapter {
  return new ReactFrameworkAdapter();
}
