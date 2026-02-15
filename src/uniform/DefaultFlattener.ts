import {IJsompNode, JsompFlattener} from "../types";
import {internalContext as context} from "../context";

/**
 * Object flattening/reconstruction tool (pure functional implementation)
 */
export class DefaultFlattener implements JsompFlattener {
  /**
   * Flatten nested object/array into Map<Id, Entity>
   * @param root root object or object array
   * @param idField ID field name
   * @param childrenField children field name
   */
  public flatten<T extends IJsompNode = IJsompNode>(
    root: any,
    idField: string = 'id',
    childrenField: string = 'children'
  ): Map<string, T> {
    const result = new Map<string, T>();
    DefaultFlattener.processNode(root, null, result, idField, childrenField);
    return result;
  }

  private static processNode<T extends IJsompNode>(
    node: any,
    parentId: string | null,
    map: Map<string, T>,
    idKey: string,
    childKey: string
  ) {
    if (!node) return;

    // 1. Handle array (case where root is an array)
    if (Array.isArray(node)) {
      for (const item of node) {
        this.processNode(item, parentId, map, idKey, childKey);
      }
      return;
    }

    // 2. Handle object
    if (typeof node === 'object') {
      const id = String(node[idKey]);

      // If there is no ID and it's not an empty object, maybe we need a warning or auto-generation?
      // For now: skip if no ID, to force the model to output ID
      if (!id || id === 'undefined' || id === 'null') {
        context.logger.warn(`Skipping node without valid ID. Node type: ${node.type || 'unknown'}`);
        return;
      }

      // Extract properties of the current node
      // Note: Shallow copy is needed, and children field should be removed to prevent circular references or data redundancy
      const {[childKey]: children, ...rest} = node;

      const entity = {
        id,
        type: rest.type || 'unknown',
        parent: parentId, // Explicitly record parent-child relationship
        ...rest
      } as T;

      map.set(id, entity);

      // Recursively process child nodes
      if (Array.isArray(children)) {
        for (const child of children) {
          this.processNode(child, id, map, idKey, childKey);
        }
      }
    }
  }

  /**
   * Reconstruct flat Map into nested tree
   */
  public unflatten<T = any>(
    entities: Map<string, IJsompNode>,
    rootId?: string,
    childrenField: string = 'children'
  ): T[] {
    const nodeMap = new Map<string, any>();
    const roots: T[] = [];

    // 1. Pass 1: Create all node containers (with empty children array)
    for (const [id, entity] of entities) {
      // Strip parent field (optional, depending on whether the output object should keep parent reference)
      // Keep parent here for business layer use, as long as it doesn't cause serialization loops
      const node = {...entity, [childrenField]: []};
      nodeMap.set(id, node);
    }

    // 2. Pass 2: Assemble tree structure
    for (const [id, node] of nodeMap) {
      const parentId = node.parent;

      // Determine if it is a root node
      // 1. If rootId is specified, only that ID is a root (usually for partial reconstruction)
      // 2. If rootId is not specified, it's a root if parent is empty or parent points to a non-existent node
      const isRoot = rootId
        ? id === rootId
        : (!parentId || !nodeMap.has(parentId));

      if (isRoot) {
        roots.push(node as T);
      } else {
        const parent = nodeMap.get(parentId);
        if (parent) {
          parent[childrenField].push(node);
        }
      }
    }

    return roots;
  }
}
