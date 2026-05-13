/**
 * Orphan Type Registry Interface
 *
 * Manages which node types are allowed to exist as orphan roots
 * (nodes without a parent reference) in the render tree.
 *
 * By default, only explicitly registered types (e.g. 'window') are allowed.
 * All other orphan nodes (like templates) are excluded from rendering.
 */
export interface IOrphanTypeRegistry {
  /**
   * Register a node type as an allowed orphan root.
   * @param type - The node type string (e.g. 'window')
   */
  register(type: string): void;

  /**
   * Unregister a node type, preventing it from being rendered as an orphan.
   * @param type - The node type string to remove
   */
  unregister(type: string): void;

  /**
   * Check if a node type is allowed to be an orphan root.
   * @param type - The node type string to check
   */
  isAllowed(type: string): boolean;

  /**
   * Get all registered orphan types.
   */
  getAll(): ReadonlySet<string>;

  /**
   * Clear all registered types.
   */
  clear(): void;
}