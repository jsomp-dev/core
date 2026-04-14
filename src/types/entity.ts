import {IJsompNode} from './node';

export type EntityConflictMode = 'error' | 'warn' | 'append' | 'override';

export interface EntityRegisterOptions {
  conflictMode?: EntityConflictMode;
}

/**
 * JSOMP Entity Registry Interface
 * Manages reusable node templates and fragments.
 */
export interface IEntityRegistry {
  /**
   * Register a group of nodes under a namespace.
   * IDs and parent references within the nodes will be automatically prefixed.
   * 
   * @param ns Namespace, e.g., "ui.card"
   * @param nodes Array of nodes to register
   * @param options Registration options
   */
  register(ns: string, nodes: IJsompNode[], options?: EntityRegisterOptions): void;

  /**
   * Get a node by its full ID (including namespace prefix).
   * @param fullId The complete ID, e.g., "ui.card.root"
   */
  get(fullId: string): IJsompNode | undefined;

  /**
   * Unregister all nodes within a namespace.
   * @param ns Namespace to clear
   */
  unregister(ns: string): void;

  /**
   * Clear the entire registry.
   */
  clear(): void;

  /**
   * Get all children of a node by its parent ID.
   * @param parentId The parent's full ID
   */
  getChildren(parentId: string): IJsompNode[];

  /**
   * Get all registered nodes as a flat Map.
   */
  all(): ReadonlyMap<string, IJsompNode>;
}
