import type { VisualDescriptor } from './node';
import type { PerformanceMetrics } from './runtime';

/**
 * Runtime Adapter Interface
 *
 * Bridges JsompRuntime's VisualDescriptor[] output to each framework's
 * reactive system. Each framework must implement this to enable
 * zero-diff, incremental rendering.
 *
 * Design principle: The adapter holds NO rendering logic.
 * It only manages the subscription model and snapshot delivery.
 */
export interface IRuntimeAdapter {

  /** Current render context for this adapter (mutable) */
  currentContext: IRenderContext;
  /**
   * Subscribe to runtime state changes.
   * Called by the framework's rendering layer to know when to re-render.
   * @param onStoreChange - Callback invoked when runtime state changes
   * @returns Unsubscribe function
   */
  subscribe(onStoreChange: () => void): () => void;

  /**
   * Get a stable snapshot of all VisualDescriptors.
   * The snapshot must be referentially stable between calls
   * if the underlying data has not changed (for O(1) change detection).
   * @returns Current array of VisualDescriptors
   */
  getSnapshot(): VisualDescriptor[];

  /**
   * Feed new entity data into the runtime.
   * This triggers an incremental update and notifies subscribers.
   * @param entities - Normalized entity map
   */
  feed(entities: Map<string, any>): void;

  /**
   * Get the current data version.
   * Frameworks can use this to detect whether a state change occurred.
   * @returns Current version number
   */
  getVersion(): number;

  /**
   * Get runtime performance metrics.
   * @returns Performance metrics snapshot
   */
  getMetrics?(): Partial<PerformanceMetrics> | undefined;
}

/**
 * Render Context passed during descriptor resolution.
 * Provides all information needed to resolve a single VisualDescriptor
 * into a framework element.
 */
export interface IRenderContext {
  /** Component type mapping table (e.g., { box: BoxComponent, text: TextComponent }) */
  components: Record<string, any>;
  /** Current path stack for relative path resolution */
  pathStack: string[];
  /** Slot distribution table for current node */
  slots: Record<string, string[]>;
  /** Global style presets */
  stylePresets?: Record<string, any>;
  /** O(1) descriptor lookup map for recursive rendering */
  descriptorMap: Map<string, VisualDescriptor>;
  /** Runtime adapter reference for metrics/version access */
  runtimeAdapter: IRuntimeAdapter;
}

/**
 * Render Root Interface
 *
 * Represents the mounted, live rendering root.
 * Each framework's renderer returns a root instance after mounting.
 */
export interface IRenderRoot {
  /**
   * Mount the render root into a DOM/container element.
   * @param container - Target DOM element or framework-managed container
   */
  mount(container: Element): void;

  /**
   * Unmount and clean up the render root.
   */
  unmount(): void;

  /**
   * Force a full re-render.
   * Used when context (components, stylePresets) changes externally.
   */
  forceUpdate(): void;
}

/**
 * Renderer Interface
 *
 * Responsible for transforming VisualDescriptor[] into framework-specific
 * component instances. Each framework (React, Vue, Solid, etc.) provides
 * its own implementation.
 *
 * The renderer does NOT hold runtime state — it only reacts to
 * IRuntimeAdapter snapshots passed to it.
 */
export interface IRenderer {
  /** Human-readable renderer name (e.g., 'react', 'vue', 'solid') */
  readonly name: string;

  /**
   * Create a mounted render root connected to a runtime adapter.
   * @param adapter - Connected runtime adapter
   * @param options - Render initialization options
   * @returns Mounted render root
   */
  createRoot(
    adapter: IRuntimeAdapter,
    options?: {
      /** Component type mapping table */
      components?: Record<string, any>;
      /** Style preset mapping */
      stylePresets?: Record<string, any>;
      /** Root DOM container (for frameworks that need it at creation time) */
      container?: Element;
    }
  ): IRenderRoot;

  /**
   * Resolve a single VisualDescriptor into a framework element.
   * Called recursively by the renderer during tree traversal.
   * @param descriptor - The descriptor to resolve
   * @param ctx - Render context
   * @returns Framework element/component
   */
  resolve(descriptor: VisualDescriptor, ctx: IRenderContext): any;
}
