import {IJsompLayoutManager, IJsompNode, JsompHierarchyNode} from '../../types';

/**
 * LayoutManager Implementation
 * Responsible for calculating paths and providing topological views of JSOMP nodes.
 */
export class JsompLayoutManager<TId extends string = string, TLayout extends readonly IJsompNode[] = any> implements IJsompLayoutManager<TId, TLayout> {
  private _pathCache: Map<IJsompNode, string> = new Map();
  private _idMap: Map<string, IJsompNode[]> = new Map();
  private _hierarchy?: JsompHierarchyNode;

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
    while (current.parent) {
      const parentNodes = this._idMap.get(current.parent);
      if (!parentNodes || parentNodes.length === 0) break;

      // Use the first parent found. 
      // Note: In case of non-unique IDs, this may lead to incorrect paths 
      // if child nodes are not correctly associated with their specific parent instance.
      // However, JSOMP usually expects unique IDs or locally unique within a parent.
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
   * Get the topological hierarchy tree
   */
  public getHierarchy(): JsompHierarchyNode {
    if (this._hierarchy) return this._hierarchy;

    // Group nodes by parent ID for tree construction
    const childrenMap = new Map<string | null, IJsompNode[]>();
    for (const node of this.nodes) {
      const parentId = node.parent || null;
      const children = childrenMap.get(parentId) || [];
      children.push(node);
      childrenMap.set(parentId, children);
    }

    const roots = childrenMap.get(null) || [];

    const buildTree = (node: IJsompNode): JsompHierarchyNode => {
      const hierarchyNode: JsompHierarchyNode = {
        id: node.id,
        type: node.type,
        path: this.getNodePath(node),
      };

      if (node.slot) {
        hierarchyNode.slot = node.slot;
      }

      const children = childrenMap.get(node.id);
      if (children && children.length > 0) {
        hierarchyNode.children = children.map(buildTree);
      }

      return hierarchyNode;
    };

    if (roots.length === 1) {
      this._hierarchy = buildTree(roots[0]);
    } else if (roots.length > 1) {
      // Create a virtual root for multi-root layouts
      this._hierarchy = {
        id: 'root',
        type: 'View',
        path: 'root',
        children: roots.map(buildTree),
      };
    } else if (this.nodes.length > 0) {
      // Fallback if no explicit root found (e.g. parent is set to something non-existent)
      this._hierarchy = buildTree(this.nodes[0]);
    } else {
      this._hierarchy = {id: 'empty', type: 'Empty', path: 'empty'};
    }

    return this._hierarchy!;
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
