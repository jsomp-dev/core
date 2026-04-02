/**
 * Simple utility for path-based object access (lodash-like)
 */
export const pathUtils = {
  /**
   * Get value from object by path (e.g. "user.profile.name")
   */
  get(obj: any, path: string): any {
    if (!path || path === '*') return obj;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  },

  /**
   * Set value in object by path (Immutable Update)
   */
  set(obj: any, path: string, value: any): any {
    if (!path || path === '*') return value;
    const parts = path.split('.');

    const setRecursive = (o: any, pIdx: number): any => {
      const part = parts[pIdx];
      const isLast = pIdx === parts.length - 1;

      // Create new container
      const current = Array.isArray(o) ? [...o] : (o && typeof o === 'object' ? {...o} : {});

      if (isLast) {
        current[part] = value;
      } else {
        current[part] = setRecursive(current[part], pIdx + 1);
      }
      return current;
    };

    return setRecursive(obj, 0);
  },

  /**
   * Patch an object at a path with a partial object (Immutable Update).
   * Returns a list of paths that were modified.
   */
  patch(obj: any, path: string, patchObj: any): {nextState: any, modifiedPaths: string[]} {
    const root = this.get(obj, path);
    if (!root || typeof root !== 'object' || typeof patchObj !== 'object') {
      const nextState = this.set(obj, path, patchObj);
      return {nextState, modifiedPaths: [path]};
    }

    const modifiedPaths: string[] = [path];
    const newRoot = Array.isArray(root) ? [...root] : {...root};

    Object.keys(patchObj).forEach(key => {
      const val = patchObj[key];
      if (newRoot[key] !== val) {
        newRoot[key] = val;
        modifiedPaths.push(path ? `${path}.${key}` : key);
      }
    });

    const nextState = this.set(obj, path, newRoot);
    return {nextState, modifiedPaths};
  },

  /**
   * Split path into all segments (e.g. "a.b.c" -> ["a", "a.b", "a.b.c"])
   */
  segments(path: string): string[] {
    if (!path) return [];
    const parts = path.split('.');
    const res: string[] = [];
    let current = '';
    for (const part of parts) {
      current = current ? `${current}.${part}` : part;
      res.push(current);
    }
    return res;
  }
};
