import type {
  FrameworkManifest,
  IFrameworkAdapter,
  IFrameworkRegistry
} from '../../types';
/**
 * Framework registry implementation that manages framework adapter registration,
 * lazy initialization, and active framework selection.
 */
export class FrameworkRegistry implements IFrameworkRegistry {
  /** Map of initialized adapters by framework ID */
  private _adapters = new Map<string, IFrameworkAdapter>();
  /** Map of registered manifests by framework ID */
  private _manifests = new Map<string, FrameworkManifest>();
  /** Currently active framework ID, or null if none selected */
  private _activeId: string | null = null;
  /** Map of manifest factories awaiting lazy initialization */
  private _factories = new Map<string, FrameworkManifest>();

  /**
   * Registers an already-instantiated framework adapter.
   * Use this for imperative registration with pre-created adapters.
   * @param target - Unique framework identifier (e.g., 'react', 'vue')
   * @param adapter - The instantiated adapter to register
   */
  public register(target: string, adapter: IFrameworkAdapter): void {
    this._adapters.set(target, adapter);
    this._manifests.set(target, adapter.manifest);
  }

  /**
   * Registers a framework manifest for lazy initialization.
   * The actual adapter instance is created on first activation.
   * This is the preferred method for declarative registration.
   * @param manifest - The framework manifest containing metadata and factory
   */
  public registerManifest(manifest: FrameworkManifest): void {
    if (this._factories.has(manifest.id)) {
      console.warn(`[JSOMP] Framework manifest "${manifest.id}" already registered. Skipping.`);
      return;
    }
    this._factories.set(manifest.id, manifest);
  }

  /**
   * Initializes a framework adapter from its manifest factory.
   * Returns cached instance if already initialized.
   * @param target - Framework identifier to initialize
   * @returns The initialized framework adapter
   * @throws Error if manifest not found for target
   */
  public async initializeFramework(target: string): Promise<IFrameworkAdapter> {
    // If target is 'fallback', instead of using the fallback adapter directly, 
    // we dynamically import the fallback adapter for tree shaking
    if (target === 'fallback') {
      const fallbackAdapter = (await import('./FallbackFrameworkAdapter')).fallbackAdapter;
      this._adapters.set(target, fallbackAdapter);
      return fallbackAdapter;
    }

    const manifest = this._factories.get(target);
    if (!manifest) {
      throw new Error(`[JSOMP] Framework manifest "${target}" not found. Did you forget to register it?`);
    }

    if (this._adapters.has(target)) {
      return this._adapters.get(target)!;
    }

    // Invoke the manifest factory to create the adapter
    const module = await manifest.factory();
    const adapter = 'createAdapter' in module
      ? module.createAdapter()
      : module as IFrameworkAdapter;

    this._adapters.set(target, adapter);
    this._manifests.set(target, manifest);

    return adapter;
  }

  /**
   * Retrieves a registered framework adapter by ID.
   * Returns undefined if not found or not yet initialized.
   * @param target - Framework identifier to look up
   * @returns The adapter if found, undefined otherwise
   */
  public get(target: string): IFrameworkAdapter | undefined {
    return this._adapters.get(target);
  }

  /**
   * Retrieves a framework's manifest by ID.
   * @param target - Framework identifier to look up
   * @returns The manifest if found, undefined otherwise
   */
  public getManifest(target: string): FrameworkManifest | undefined {
    return this._manifests.get(target);
  }

  /**
   * Returns the currently active framework adapter.
   * If no framework has been activated, returns the fallback adapter
   * for framework-agnostic operation.
   * @returns The active framework adapter (never undefined)
   */
  public getActive(): IFrameworkAdapter {
    const activeId = this._activeId;
    if (!activeId) {
      throw new Error(`[JSOMP] No framework is active.`);
    }
    const adapter = this._adapters.get(activeId);
    if (!adapter) {
      throw new Error(`[JSOMP] Active framework "${activeId}" not initialized.`);
    }
    return adapter;
  }

  /**
   * Activates a framework by ID, initializing it if necessary.
   * After activation, getActive() will return this framework.
   * @param target - Framework identifier to activate
   * @throws Error if framework is not registered
   */
  public async setActive(target: string): Promise<void> {
    if (target !== 'fallback' && !this._factories.has(target) && !this._adapters.has(target)) {
      throw new Error(`[JSOMP] Framework "${target}" is not registered.`);
    }

    if (!this._adapters.has(target)) {
      await this.initializeFramework(target);
    }

    this._activeId = target;
  }

  /**
   * Returns all registered framework IDs (both initialized and factory-only).
   * @returns Array of framework identifier strings
   */
  public getRegisteredFrameworks(): string[] {
    return Array.from(new Set([
      ...this._adapters.keys(),
      ...this._factories.keys()
    ]));
  }
}
