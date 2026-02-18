import {IJsompLayoutManager, IJsompNode, JsompHierarchyNode, JsompHierarchyOptions} from '../types';

/**
 * LayoutManager Implementation
 * Responsible for calculating paths and providing topological views of JSOMP nodes.
 */
export class JsompLayoutManager<TId extends string = string, TLayout extends readonly IJsompNode[] = any> implements IJsompLayoutManager<TId, TLayout> {
  private _pathCache: Map<IJsompNode, string> = new Map();
  private _idMap: Map<string, IJsompNode[]> = new Map();
  private _hierarchyCache: Map<string, JsompHierarchyNode> = new Map();

  constructor(private readonly nodes: readonly IJsompNode[]) {
    this._buildIndex();
  }

  /**
   * Build internal lookup index for faster path resolution
   */
  private _buildIndex() {
    for (const node of this.nodes) {
      if (!node.id) continue;
      const list = this._idMap.get(node.id) || [];
      list.push(node);
      this._idMap.set(node.id, list);
    }
  }

  /**
   * Get all nodes matching the ID, each with its calculated _fullPath
   */
  public getNodes(id: TId): Array<IJsompNode & {_fullPath: string}> {
    const list = this._idMap.get(id) || [];
    return list.map(node => ({
      ...node,
      _fullPath: this.getNodePath(node),
    }));
  }

  /**
   * Helper to resolve parent ID, supporting legacy slot notation
   */
  private _getParentId(node: IJsompNode): string | null {
    const parentVal = node.parent;
    if (!parentVal) return null;

    if (parentVal.startsWith('[slot]')) {
      const content = parentVal.slice(6);
      const segments = content.split('.');
      return segments.length > 1 ? segments[segments.length - 2] : segments[0];
    }

    if (parentVal.includes('.')) {
      return parentVal.split('.').pop()!;
    }

    return parentVal;
  }

  /**
   * Calculates the full path of a node recursively
   */
  public getNodePath(node: IJsompNode): string {
    if (this._pathCache.has(node)) {
      return this._pathCache.get(node)!;
    }

    const pathParts: string[] = [node.id];
    let current = node;
    const visited = new Set<IJsompNode>([node]);

    // Trace back to root
    while (true) {
      const parentId = this._getParentId(current);
      if (!parentId) break;

      const parentNodes = this._idMap.get(parentId);
      if (!parentNodes || parentNodes.length === 0) break;

      const parent = parentNodes[0];

      if (visited.has(parent)) {
        // Cycle detected
        break;
      }

      pathParts.unshift(parent.id);
      current = parent;
      visited.add(parent);
    }

    const fullPath = pathParts.join('.');
    this._pathCache.set(node, fullPath);
    return fullPath;
  }

  /**
   * Get all valid full paths in the layout
   */
  public getAllPaths(): string[] {
    return this.nodes.map(node => this.getNodePath(node));
  }

  /**
   * Helper to resolve slot name, supporting legacy slot notation
   */
  private _getSlot(node: IJsompNode): string | undefined {
    if (node.slot) return node.slot;

    const parentVal = node.parent;
    if (parentVal && parentVal.startsWith('[slot]')) {
      const content = parentVal.slice(6);
      const segments = content.split('.');
      return segments.length > 1 ? segments.pop() : undefined;
    }

    return undefined;
  }

  /**
   * Get the topological hierarchy tree
   */
  public getHierarchy(options: JsompHierarchyOptions = {}): JsompHierarchyNode {
    const cacheKey = JSON.stringify(options);
    if (this._hierarchyCache.has(cacheKey)) return this._hierarchyCache.get(cacheKey)!;

    // Group nodes by parent ID for tree construction
    const childrenMap = new Map<string | null, IJsompNode[]>();
    for (const node of this.nodes) {
      const parentId = this._getParentId(node);
      const children = childrenMap.get(parentId) || [];
      children.push(node);
      childrenMap.set(parentId, children);
    }

    const roots = childrenMap.get(null) || [];

    const buildTree = (node: IJsompNode): JsompHierarchyNode => {
      const hierarchyNode: JsompHierarchyNode = {
        id: node.id,
        type: node.type,
      };

      if (options.includePath) {
        hierarchyNode.path = this.getNodePath(node);
      }

      const slot = this._getSlot(node);
      if (slot) {
        hierarchyNode.slot = slot;
      }

      const children = childrenMap.get(node.id);
      if (children && children.length > 0) {
        hierarchyNode.children = children.map(buildTree);
      }

      return hierarchyNode;
    };

    let result: JsompHierarchyNode;

    if (roots.length === 1) {
      result = buildTree(roots[0]);
    } else if (roots.length > 1) {
      // Create a virtual root for multi-root layouts
      result = {
        id: 'root',
        type: 'View',
        children: roots.map(buildTree),
      };
      if (options.includePath) {
        result.path = 'root';
      }
    } else if (this.nodes.length > 0) {
      // Fallback if no explicit root found
      result = buildTree(this.nodes[0]);
    } else {
      result = {id: 'empty', type: 'Empty'};
      if (options.includePath) {
        result.path = 'empty';
      }
    }

    this._hierarchyCache.set(cacheKey, result);
    return result;
  }

  /**
   * Type-safe path chain proxy
   */
  public get path(): any { // Generic type is enforced by the interface
    return this._createPathProxy([]);
  }

  /**
   * Recursively create proxies for path segments
   */
  private _createPathProxy(segments: string[]): any {
    return new Proxy({}, {
      get: (target, prop) => {
        if (prop === '$') {
          return segments.join('.');
        }
        if (typeof prop === 'string') {
          return this._createPathProxy([...segments, prop]);
        }
        return undefined;
      }
    });
  }
}

/**
 * Factory function to create a LayoutManager with type inference Support
 * @param data JSOMP entity array (best used with 'as const')
 */
export function createLayoutManager<T extends readonly IJsompNode[]>(
  data: T
): IJsompLayoutManager<T[number]['id'], T> {
  return new JsompLayoutManager<T[number]['id'], T>(data);
}
