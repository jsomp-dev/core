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
   * Set value in object by path
   */
  set(obj: any, path: string, value: any): void {
    if (!path) return;
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || current[part] === null || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
    current[parts[parts.length - 1]] = value;
  },

  /**
   * Patch an object at a path with a partial object.
   * Returns a list of paths that were modified.
   */
  patch(obj: any, path: string, patchObj: any): string[] {
    const root = this.get(obj, path);
    if (!root || typeof root !== 'object' || typeof patchObj !== 'object') {
      this.set(obj, path, patchObj);
      return [path];
    }

    const modifiedPaths: string[] = [path];
    const walk = (target: any, patch: any, currentPath: string) => {
      Object.keys(patch).forEach(key => {
        const val = patch[key];
        const nextPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (val !== null && typeof val === 'object' && !Array.isArray(val) && 
            target[key] !== null && typeof target[key] === 'object' && !Array.isArray(target[key])) {
          walk(target[key], val, nextPath);
        } else if (target[key] !== val) {
          target[key] = val;
          modifiedPaths.push(nextPath);
        }
      });
    };

    walk(root, patchObj, path);
    return modifiedPaths;
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
