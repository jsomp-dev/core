import {IAtomRegistry, IJsompNode} from '../../types';
import {JsompAtom} from './JsompAtom';
import {context} from "../../setup";

/**
 * Node Restorer
 * Responsible for converting between flat Map and tree structure, and handling initial state.
 */
export class NodeRestorer {
  /**
   * Restore flat Map to JSOMP Tree
   */
  public static restore(
    entities: Map<string, any>,
    rootId?: string,
    atomRegistry?: IAtomRegistry
  ): IJsompNode[] {
    const flattener = context.flattener;
    if (!flattener) {
      context.logger.throw('CORE_FLATTENER_MISSING', 'Flattener is not initialized. Please call setup() first.');
    }

    // --- 1. Handle State declarations ---
    if (atomRegistry) {
      entities.forEach((entity, id) => {
        if (entity.type === 'State') {
          if (!atomRegistry.get(id)) {
            const initialValue = entity.props?.value ?? entity.props?.initial;
            atomRegistry.set(id, new JsompAtom(initialValue));
          }
        }
      });
    }

    // --- 2. Build path addressing context (resolve nesting relationship) ---
    const uiEntitiesMap = new Map<string, any>();
    entities.forEach((v, k) => {
      if (v.type !== 'State') {
        // Deep clone to prevent side effects
        uiEntitiesMap.set(k, {
          ...v,
          id: v.id || k,
          props: v.props ? {...v.props} : {},
          children: v.children ? [...v.children] : []
        });
      }
    });

    // Calculate physical path for each entity: id -> "root.parent.id"
    const idToPath = new Map<string, string>();
    const getCalculatedPath = (id: string): string => {
      if (idToPath.has(id)) return idToPath.get(id)!;
      const entity = uiEntitiesMap.get(id);
      if (!entity) return id;

      const parentVal = entity.parent;
      const parentId = (typeof parentVal === 'string' && parentVal.includes('.'))
        ? (parentVal.startsWith('[slot]') ? parentVal.split('.').slice(0, -1).join('.').split('.').pop()! : parentVal.split('.').pop()!)
        : parentVal;

      const path = (parentId && parentId !== 'root' && uiEntitiesMap.has(parentId))
        ? `${getCalculatedPath(parentId)}.${id}`
        : id;

      idToPath.set(id, path);
      return path;
    };

    // Reverse index: Physical Path -> Real ID
    const pathToId = new Map<string, string>();
    uiEntitiesMap.forEach((_, id) => {
      pathToId.set(getCalculatedPath(id), id);
    });

    // --- 3. Resolve all Parent references (Support for Slots and Deep Paths) ---
    uiEntitiesMap.forEach((node) => {
      const parentVal = node.parent;
      if (typeof parentVal !== 'string') return;

      if (parentVal.startsWith('[slot]')) {
        const content = parentVal.slice(6);
        const segments = content.split('.');
        const slotName = segments.pop()!;
        const parentPath = segments.join('.');

        node.parent = pathToId.get(parentPath) || segments[segments.length - 1];
        (node as any).__jsomp_slot = slotName;
      }
      else if (parentVal.includes('.')) {
        node.parent = pathToId.get(parentVal) || parentVal.split('.').pop();
      }
    });

    // --- 4. Call flattener.unflatten to restore basic structure ---
    const tree = flattener.unflatten(uiEntitiesMap, rootId);

    // --- 5. Post-processing: Slot distribution ---
    const applySlots = (nodes: IJsompNode[]) => {
      nodes.forEach(node => {
        const anyNode = node as any;
        if (anyNode.children && anyNode.children.length > 0) {
          applySlots(anyNode.children);

          const realChildren: IJsompNode[] = [];
          anyNode.children.forEach((child: any) => {
            if (child.__jsomp_slot) {
              const slotName = child.__jsomp_slot;
              delete child.__jsomp_slot;
              node.props = node.props || {};
              const prev = node.props[slotName];

              if (prev) {
                if (Array.isArray(prev)) {
                  prev.push(child);
                } else {
                  node.props[slotName] = [prev, child];
                }
              } else {
                node.props[slotName] = child;
              }
            } else {
              realChildren.push(child);
            }
          });
          anyNode.children = realChildren;
        }
      });
    };

    applySlots(tree);
    return tree;
  }

  /**
   * Flatten JSOMP Tree for storage
   */
  public static flatten(nodes: IJsompNode[] | IJsompNode): Map<string, any> {
    const flattener = context.flattener;
    if (!flattener) {
      context.logger.throw('CORE_FLATTENER_MISSING', 'Flattener is not initialized. Please call setup() first.');
    }

    const prepareForFlatten = (node: any, pathPrefix: string = '') => {
      const currentPath = pathPrefix ? `${pathPrefix}.${node.id}` : node.id;
      const props = node.props || {};

      Object.keys(props).forEach(key => {
        const val = props[key];
        const isNode = (v: any) => v && typeof v === 'object' && v.type && v.props && v.id;
        const slotNodes = Array.isArray(val) ? val.filter(isNode) : (isNode(val) ? [val] : []);

        slotNodes.forEach(sn => {
          node.children = node.children || [];
          if (!node.children.includes(sn)) node.children.push(sn);

          sn.parent = `[slot]${currentPath}.${key}`;

          if (Array.isArray(val)) {
            props[key] = val.filter(v => v !== sn);
            if (props[key].length === 0) delete props[key];
          } else {
            delete props[key];
          }
        });
      });

      if (node.children) {
        node.children.forEach((c: any) => prepareForFlatten(c, currentPath));
      }
    };

    const treeCopy = JSON.parse(JSON.stringify(nodes));
    const roots = Array.isArray(treeCopy) ? treeCopy : [treeCopy];
    roots.forEach(r => prepareForFlatten(r));

    const target = roots.length === 1 ? roots[0] : {id: 'root', children: roots};
    const map = flattener.flatten(target, 'id', 'children');

    if (Array.isArray(nodes)) {
      map.delete('root');
    }

    return map;
  }
}
