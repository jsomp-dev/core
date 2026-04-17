import {JsompConfig, JsompLogger, JsompFlattener, JsompEventBus, IJsompEnv, IJsompService, IConfigRegistry} from './types';
import {ConfigRegistry} from './registry/ConfigRegistry';
import {JsompService} from './JsompService';
import {FrameworkLoader} from './framework/core/FrameworkLoader';
import {FrameworkManifest} from './types';

/**
 * JSOMP Environment Container (Global Registry)
 * A unified container for all tools and service instances.
 */
export class JsompEnv implements IJsompEnv {
  private _logger?: JsompLogger;
  private _flattener?: JsompFlattener;
  // TODO: Evaluate and implement event system
  private _eventBus?: JsompEventBus;
  private _service?: IJsompService;
  private _config: IConfigRegistry = new ConfigRegistry();
  private _frameworkLoader: FrameworkLoader = new FrameworkLoader();

  public isSetup = false;

  /**
   * Global registry instance
   */
  public static readonly instance = new JsompEnv();

  private constructor() { }

  // --- Getters with Guard ---

  public get logger(): JsompLogger {
    if (!this._logger) throw new Error('[JSOMP] Logger not initialized. Call setupJsomp() first.');
    return this._logger;
  }

  public get flattener(): JsompFlattener {
    if (!this._flattener) throw new Error('[JSOMP] Flattener not initialized. Call setupJsomp() first.');
    return this._flattener;
  }

  public get eventBus(): JsompEventBus | undefined {
    return this._eventBus || undefined;
  }

  public get service(): IJsompService {
    if (!this._service) throw new Error('[JSOMP] Service not initialized. Call setupJsomp() first.');
    return this._service;
  }

  public get config(): IConfigRegistry {
    return this._config;
  }

  public get frameworkLoader(): FrameworkLoader {
    return this._frameworkLoader;
  }

  /**
   * Initialize tools and variables in the container.
   * Supports dynamic injection, default fallbacks, and framework auto-discovery.
   * @param config - Optional configuration object for JSOMP initialization
   */
  public async init(config: JsompConfig = {}): Promise<void> {
    // 0. Merge user configuration into registry
    this._config.merge(config);

    // 1. Service Injection
    // If a service instance is provided via config, use it; otherwise create a default
    const injectedService = this._config.get('service');
    if (injectedService) {
      this._service = injectedService;
    } else {
      this._service = new JsompService();
    }

    // 2. Logger (Dynamic Load Default if missing)
    // Allow user-provided logger, otherwise fall back to default implementation
    const logger = this._config.get('logger');
    if (logger) {
      this._logger = logger;
    } else if (!this._logger) {
      const {DefaultLogger} = await import('./uniform/DefaultLogger');
      this._logger = new DefaultLogger();
    }

    // 3. Flattener
    // Allow user-provided flattener, otherwise fall back to default
    const flattener = this._config.get('flattener');
    if (flattener) {
      this._flattener = flattener;
    } else if (!this._flattener) {
      const {DefaultFlattener} = await import('./uniform/DefaultFlattener');
      this._flattener = new DefaultFlattener();
    }

    // 4. EventBus
    // Allow user-provided event bus, otherwise fall back to default
    const eventBus = this._config.get('eventBus');
    if (eventBus) {
      this._eventBus = eventBus;
    } else if (!this._eventBus) {
      const {DefaultEventBus} = await import('./uniform/DefaultEventBus');
      this._eventBus = new DefaultEventBus();
    }

    // 5. Load frameworks
    await this._loadFrameworks();

    // 6. Activate framework based on config
    await this._activateFramework(config);
  }

  private async _loadFrameworks() {
    // Framework Registry Initialization with Auto-Discovery
    // 1 Load all built-in frameworks (React, etc.)
    this._frameworkLoader.loadBuiltInFrameworks();

    // 2 Load external framework packages if configured
    // This enables future frameworks like @jsomp/framework-vue to be loaded dynamically
    const externalFrameworks = this._config.get('externalFrameworks', []) as string[];
    if (externalFrameworks.length > 0) {
      await this._frameworkLoader.loadExternalFrameworks(externalFrameworks);
    }
  }

  // Activate the framework based on configuration
  // Support three modes:
  // - 'auto': Automatically detect best framework based on environment
  // - 'react' (default): Explicitly use React
  // - Custom framework ID: Use specified framework if registered
  private async _activateFramework(config: JsompConfig) {
    const frameworkId = this._config.get('framework', config.framework ?? 'auto') as string;

    if (frameworkId === 'auto') {
      // Auto-detection mode: detect best available framework
      const detectedFramework = await this._frameworkLoader.autoDetect({
        hasReact: this._hasPackage('react'),
        hasVue: this._hasPackage('vue'),
        hasSolid: this._hasPackage('solid-js'),
        hasPreact: this._hasPackage('preact')
      });
      await this._service!.frameworks.setActive(detectedFramework);
    } else {
      // Explicit framework selection
      await this._service!.frameworks.setActive(frameworkId);
    }
  }

  public registerBuiltInFramework(manifest: FrameworkManifest) {
    this._frameworkLoader.registerBuiltInFramework(manifest);
  }

  /**
   * Checks if a package is available in the current environment.
   * Used for framework auto-detection to determine which frameworks are present.
   * @param packageName - Name of the package to check (e.g., 'react', 'vue')
   * @returns true if the package is detected in the environment
   */
  private _hasPackage(packageName?: string): boolean {
    try {
      // Check for package in various ways common in Node and browser environments
      if (typeof window !== 'undefined') {
        if (packageName !== undefined) {
          return Boolean((window as any)[packageName] !== undefined);
        }
        // Browser environment: check global scope
        const globalNames = ['react', 'React', 'vue', 'Vue', 'solid-js', 'preact'];
        for (const name of globalNames) {
          if (Boolean((window as any)[name] !== undefined)) return true;
        }
      }
      // For server-side or build-time detection, check if module can be resolved
      // This is a simplified check; a real implementation might use require.resolve
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Internal bridge to set service instance.
   * Called by setup functions to inject custom service implementations.
   * @param service - The JSOMP service instance to set
   */
  public setService(service: IJsompService) {
    this._service = service;
  }

  /**
   * Clears all internal state, resetting the environment to its initial state.
   */
  public clear() {
    this.isSetup = false;
    this._config = new ConfigRegistry();
    this._service = undefined;
    this._frameworkLoader = new FrameworkLoader();
  }
}

/**
 * Global singleton access to the environment container.
 * Use this instead of creating new JsompEnv instances.
 */
export const jsompEnv = JsompEnv.instance;
