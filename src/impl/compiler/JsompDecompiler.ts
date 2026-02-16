import {IJsompNode} from '../../types';
import {internalContext as context} from '../../context';

/**
 * JsompDecompiler: Handles the reverse process of converting a JSOMP Tree back to a flat Map.
 * This is modularized to support tree-shaking and custom export strategies.
 */
export class JsompDecompiler {
  /**
   * Flatten JSOMP Tree for storage
   */
  public static flatten(nodes: IJsompNode[] | IJsompNode): Map<string, any> {
    const flattener = context.flattener;
    if (!flattener) {
      context.logger.throw('CORE_FLATTENER_MISSING', 'Flattener is not initialized.');
    }

    // Deep clone to avoid mutating the render tree
    const treeCopy = JSON.parse(JSON.stringify(nodes));
    const roots = Array.isArray(treeCopy) ? treeCopy : [treeCopy];

    // 1. Pre-flatten: Mark slots back to legacy string format [slot]parent.id
    // This maintains backward compatibility with storage layers that expect this format.
    roots.forEach(r => this.prepareForFlatten(r));

    // 2. Perform flattening using the configured flattener
    const target = roots.length === 1 ? roots[0] : {id: 'root', children: roots};
    const map = flattener.flatten(target, 'id', 'children');

    if (Array.isArray(nodes)) {
      map.delete('root');
    }

    return map;
  }

  private static prepareForFlatten(node: any, pathPrefix: string = '') {
    const currentPath = pathPrefix ? `${pathPrefix}.${node.id}` : node.id;
    const props = node.props || {};

    Object.keys(props).forEach(key => {
      const val = props[key];
      const isNode = (v: any) => v && typeof v === 'object' && v.type && v.props && v.id;
      const slotNodes = Array.isArray(val) ? val.filter(isNode) : (isNode(val) ? [val] : []);

      slotNodes.forEach(sn => {
        node.children = node.children || [];
        if (!node.children.includes(sn)) node.children.push(sn);

        // Reverse conversion: inject the legacy parent addressing string
        sn.parent = `[slot]${currentPath}.${key}`;

        if (Array.isArray(val)) {
          props[key] = val.filter((v: any) => v !== sn);
          if (props[key].length === 0) delete props[key];
        } else {
          delete props[key];
        }
      });
    });

    if (node.children) {
      node.children.forEach((c: any) => this.prepareForFlatten(c, currentPath));
    }
  }
}
