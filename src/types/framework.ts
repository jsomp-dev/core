import type {IJsompEnv, IJsompService} from './index';
import type {IJsompRuntime} from './runtime';
import type {IRenderContext, IRenderer, IRuntimeAdapter} from './renderer';
import {ISignalCenter} from 'dist';

/**
 * Manifest metadata for a framework adapter package.
 * Each framework must provide a manifest to declare its identity,
 * dependencies, and capabilities for the registration system.
 */
export interface FrameworkManifest {
  /**
   * Unique identifier for the framework (e.g., 'react', 'vue', 'solid')
   */
  id: string;

  /**
   * Human-readable name of the framework (e.g., 'React', 'Vue')
   */
  name: string;

  /**
   * Minimum JSOMP engine version required for this framework adapter
   * (e.g., '^2.0.0'). If undefined, any version is accepted.
   */
  jsompVersion?: string;

  /**
   * Peer dependencies required by this framework (e.g., { react: '>=18.0.0' })
   * Used for validation and documentation purposes.
   */
  peerDependencies?: Record<string, string>;

  /**
   * Priority for auto-detection when multiple frameworks are available.
   * Higher values indicate higher priority. Defaults to 0.
   */
  priority?: number;

  /**
   * Async factory function that creates the framework adapter instance.
   * Supports both direct IFrameworkAdapter returns and { createAdapter } pattern.
   */
  factory: () => Promise<IFrameworkAdapter | { createAdapter: () => IFrameworkAdapter }>;

  /**
   * Optional validation function called during framework initialization.
   * Return false to indicate the framework cannot run in the current environment.
   * @param env - The JSOMP environment instance
   * @returns true if valid, false if framework should be skipped
   */
  validate?: (env: IJsompEnv) => boolean;
}

/**
 * Core interface for framework adapter implementations.
 * A framework adapter maps neutral JSOMP concepts to framework-specific
 * implementations (e.g., event names, rendering, state synchronization).
 */
export interface IFrameworkAdapter {
  /**
   * Reference to the framework's manifest containing metadata and capabilities.
   */
  readonly manifest: FrameworkManifest;

  /**
   * Shortcut to manifest.id for convenience (e.g., 'react', 'vue').
   */
  readonly target: string;

  /**
   * Determines if this framework owns/handles the given namespace.
   * When a namespace is owned, this framework is responsible for mapping it.
   * @param namespace - The namespace to check (e.g., 'dom', 'key', 'native')
   * @returns true if this framework handles this namespace
   */
  isOwner(namespace: string): boolean;

  /**
   * Maps a neutral event name to a framework-specific property name.
   * @param namespace - The event namespace (e.g., 'dom', 'key')
   * @param eventName - The neutral event name (e.g., 'double_click')
   * @returns The framework-specific property name (e.g., 'onDoubleClick' for React)
   */
  mapPropName(namespace: string, eventName: string): string;

  /**
   * Optional wrapper that intercepts event handlers to inject
   * framework-specific logic (e.g., keyboard shortcut matching, debouncing).
   * @param namespace - The event namespace
   * @param eventName - The event name being handled
   * @param original - The original handler function
   * @returns The wrapped handler function (or a Promise that resolves to the wrapped handler)
   */
  wrapHandler?(namespace: string, eventName: string, original: Function): Function | Promise<Function>;

  /**
   * Optional lifecycle hook called when the framework is activated.
   * Use for one-time setup, event listeners, or initial state.
   * @param service - The JSOMP service instance
   */
  initialize?(service: IJsompService): void;

  /**
   * Optional lifecycle hook called when the framework is deactivated
   * or the application shuts down. Use for cleanup.
   */
  destroy?(): void;

  /**
   * Creates a runtime adapter that bridges JsompRuntime's VisualDescriptor[]
   * to the framework's reactive rendering system.
   * @param id - The unique view identifier, usually using the component id (e.g., 'btn-1', 'main')
   * @param runtime - The JsompRuntime instance
   * @param signalCenter - The signal center for reactive updates
   * @param options - Optional framework-specific options
   * @returns Runtime adapter instance implementing IRuntimeAdapter
   */
  createRuntimeAdapter(
    id: string,
    runtime: IJsompRuntime,
    signalCenter: ISignalCenter,
    options?: any
  ): IRuntimeAdapter;

  /**
   * Returns the renderer for this framework.
   * The renderer is responsible for transforming VisualDescriptor[]
   * into framework-specific component instances.
   * @returns Renderer instance implementing IRenderer
   */
  getRenderer(): IRenderer;

  /**
   * Returns the render context for this framework.
   * The context is passed during descriptor resolution and carries
   * component mappings, path stack, slots, and runtime adapter reference.
   * @param id - The unique view identifier, usually using the component id (e.g., 'btn-1', 'main')
   * @returns Render context value
   */
  getRenderContext(id: string): IRenderContext;
}

/**
 * Registry for managing framework adapter registration and selection.
 * The registry maintains a collection of available frameworks and tracks
 * which framework is currently active for the JSOMP instance.
 */
export interface IFrameworkRegistry {
  /**
   * Registers a framework via its manifest (declarative registration).
   * The adapter instance is created lazily when the framework is first activated.
   * @param manifest - The framework manifest to register
   */
  registerManifest(manifest: FrameworkManifest): void;

  /**
   * Registers an already-instantiated framework adapter (imperative registration).
   * Useful for custom adapters created inline or for backward compatibility.
   * @param target - The framework identifier (e.g., 'react')
   * @param adapter - The adapter instance to register
   */
  register(target: string, adapter: IFrameworkAdapter): void;

  /**
   * Retrieves a registered framework adapter by its identifier.
   * @param target - The framework identifier to look up
   * @returns The adapter if found, undefined otherwise
   */
  get(target: string): IFrameworkAdapter | undefined;

  /**
   * Retrieves a framework's manifest by its identifier.
   * @param target - The framework identifier to look up
   * @returns The manifest if found, undefined otherwise
   */
  getManifest(target: string): FrameworkManifest | undefined;

  /**
   * Returns the currently active framework adapter.
   * @throws Error if no framework has been activated yet
   * @returns The active framework adapter instance
   */
  getActive(): IFrameworkAdapter;

  /**
   * Activates a framework by its identifier, initializing it if necessary.
   * @param target - The framework identifier to activate
   * @throws Error if the framework is not registered
   */
  setActive(target: string): Promise<void>;

  /**
   * Returns a list of all framework identifiers that have been registered,
   * either via manifest or direct adapter registration.
   * @returns Array of framework identifier strings
   */
  getRegisteredFrameworks(): string[];
}

/**
 * Interface for the framework loader that handles automatic discovery
 * and initialization of framework adapters.
 */
export interface IFrameworkLoader {
  /**
   * Loads all built-in framework manifests that ship with JSOMP.
   * Called automatically during setup; rarely needed manually.
   */
  loadBuiltInFrameworks(): void;

  /**
   * Loads framework adapters from external npm packages.
   * Each package should export a 'jsompFrameworkManifest' as its default export.
   * @param packages - Array of npm package names to load
   */
  loadExternalFrameworks(packages: string[]): Promise<void>;

  /**
   * Automatically detects and selects the best available framework
   * based on detected environment capabilities and framework priorities.
   * @param env - Object describing detected environment features
   * @param env.hasReact - Whether React is detected in the environment
   * @param env.hasVue - Whether Vue is detected in the environment
   * @param env.hasSolid - Whether Solid is detected in the environment
   * @param env.hasPreact - Whether Preact is detected in the environment
   * @returns The identifier of the detected framework (e.g., 'react')
   */
  autoDetect(env: FrameworkDetectionEnv): Promise<string>;
}

/**
 * Environment detection descriptor for framework auto-selection.
 * Used by FrameworkLoader.autoDetect() to determine which framework
 * is most appropriate for the current runtime environment.
 */
export interface FrameworkDetectionEnv {
  /**
   * Whether React is present in the environment
   */
  hasReact: boolean;

  /**
   * Whether Vue is present in the environment
   */
  hasVue: boolean;

  /**
   * Whether Solid is present in the environment
   */
  hasSolid: boolean;

  /**
   * Whether Preact is present in the environment
   */
  hasPreact?: boolean;
}
