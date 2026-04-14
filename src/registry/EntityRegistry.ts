import {EntityRegisterOptions, IEntityRegistry, IJsompNode} from '../types';
import {jsompEnv} from '../JsompEnv';

/**
 * Default implementation of IEntityRegistry.
 * Supports namespaced registration with automatic ID and reference prefixing.
 */
export class EntityRegistry implements IEntityRegistry {
  private nodes: Map<string, IJsompNode> = new Map();
  private childMap: Map<string, string[]> = new Map();

  /**
   * Register a group of nodes under a namespace.
   * IDs and parent references within the nodes will be automatically prefixed.
   */
  public register(ns: string, nodes: IJsompNode[], options: EntityRegisterOptions = {}): void {
    const {conflictMode = 'error'} = options;
    const prefix = ns.endsWith('.') ? ns : ns + '.';

    // 0. Base Validation: IDs cannot contain dots as they serve as path separators
    if (ns.includes('.')) {
      jsompEnv.logger.throw('INVALID_ENTITY_ID', `[EntityRegistry] Invalid ID "${ns}": Entity IDs within a registration batch cannot contain dots. Dots are reserved for scope separators.`);
    }

    // 1. Handle Override Mode
    if (conflictMode === 'override') {
      this.unregister(ns);
    }

    const localIds = new Set(nodes.map(n => n.id));

    // 2. Conflict Detection (Strict Mode: Must handle unless append/override)
    if (conflictMode !== 'append' && conflictMode !== 'override') {
      let hasConflict = false;
      for (const node of nodes) {
        const fullId = prefix + node.id;
        if (!this.nodes.has(fullId)) {
          continue;
        }
        const msg = `[EntityRegistry] Conflict: node "${fullId}" already exists in pool.`;
        if (conflictMode === 'warn') {
          jsompEnv.logger.warn(msg);
        } else if (conflictMode === 'error') {
          // Default and 'error' mode
          jsompEnv.logger.throw('ENTITY_REGISTRY_CONFLICT', msg);
        }
        hasConflict = true;
      }
      if (hasConflict) return;
    }

    nodes.forEach(node => {
      const fullId = prefix + node.id;

      // Clone to avoid mutating original objects
      const processedNode: IJsompNode = {...node, id: fullId};

      // 1. Prefix parent reference if it points to a node in the same batch
      if (processedNode.parent && localIds.has(processedNode.parent)) {
        processedNode.parent = prefix + processedNode.parent;
      }

      // Track parent-child relationship for discovery
      if (processedNode.parent) {
        if (!this.childMap.has(processedNode.parent)) {
          this.childMap.set(processedNode.parent, []);
        }
        this.childMap.get(processedNode.parent)!.push(fullId);
      }

      // 2. Prefix inherit reference if it points to a node in the same batch
      // This allows relative inheritance within a component definition
      if ((processedNode as any).inherit && localIds.has((processedNode as any).inherit)) {
        (processedNode as any).inherit = prefix + (processedNode as any).inherit;
      }

      this.nodes.set(fullId, processedNode);
    });
  }

  /**
   * Get a node by its full ID.
   */
  public get(fullId: string): IJsompNode | undefined {
    return this.nodes.get(fullId);
  }

  /**
   * Unregister all nodes within a namespace.
   */
  public unregister(ns: string): void {
    const prefix = ns.endsWith('.') ? ns : ns + '.';
    for (const [id, node] of this.nodes.entries()) {
      if (id.startsWith(prefix)) {
        if (node.parent) {
          const siblings = this.childMap.get(node.parent);
          if (siblings) {
            this.childMap.set(node.parent, siblings.filter(childId => childId !== id));
          }
        }
        this.childMap.delete(id); // Children of this node will stay orphaned unless ns is specifically cleared
        this.nodes.delete(id);
      }
    }
  }

  /**
   * Clear the entire registry.
   */
  public clear(): void {
    this.nodes.clear();
    this.childMap.clear();
  }

  /**
   * Get all children of a node by its parent ID.
   */
  public getChildren(parentId: string): IJsompNode[] {
    const ids = this.childMap.get(parentId) || [];
    return ids.map(id => this.nodes.get(id)).filter(n => !!n) as IJsompNode[];
  }

  /**
   * Returns all registered nodes.
   */
  public all(): ReadonlyMap<string, IJsompNode> {
    return this.nodes;
  }
}
