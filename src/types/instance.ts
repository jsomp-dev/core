import {IRuntimeAdapter} from './renderer';

/**
 * Instance Registry Interface
 * Manages the mapping between node IDs and their physical component instances.
 */
export interface IInstanceRegistry {
  /**
   * Set the runtime adapter to enable remote method invocation.
   * @param adapter - Runtime adapter instance
   */
  setAdapter(adapter: IRuntimeAdapter): void;

  /**
   * Set a component instance for a given ID.
   * Called by the framework adapter.
   * @param id - Node ID
   * @param instance - Physical instance (DOM, Native Object, or Proxy)
   * @param path - Optional full topology path (e.g., 'root.parent.child')
   */
  set(id: string, instance: any, path?: string): void;
  
  /**
   * Get a component instance by ID or Path.
   * Supports hierarchical backoff if contextPath is provided.
   * @param idOrPath - Node ID or Dot-notation Path
   * @param contextPath - Optional calling context path for relative lookup
   * @returns The physical instance or Proxy if available, otherwise undefined.
   */
  get<T = any>(idOrPath: string, contextPath?: string): T | undefined;

  /**
   * Get the raw instance data without Proxy wrapping.
   * Supports hierarchical backoff if contextPath is provided.
   * @param idOrPath - Node ID or Path
   * @param contextPath - Optional calling context path for relative lookup
   */
  getRaw<T = any>(idOrPath: string, contextPath?: string): T | undefined;

  /**
   * Remove an instance from the registry.
   * @param id - Node ID
   */
  remove(id: string): void;

  /**
   * TODO: port to event system (jsompSevice.events.instanceReady.subscribe((events) => {...}, options?: {targetPhase?: EventPhase.WillCommit | EventPhase.Finished | EventPhase.Aborted | EventPhase.Error}))
   * Subscribe to instance availability.
   * @param id - Node ID
   * @param callback - Function called when instance changes
   * @returns Unsubscribe function
   */
  on(id: string, callback: (instance: any) => void): () => void;

  /**
   * Clear all instances.
   */
  clear(): void;

  /**
   * Get all registered node IDs.
   */
  getIds(): string[];

  /**
   * Get all registered topology paths.
   */
  getPaths(): string[];
}
