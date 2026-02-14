/**
 * Simple utility for path-based object access (lodash-like)
 */
export const pathUtils = {
  /**
   * Get value from object by path (e.g. "user.profile.name")
   */
  get(obj: any, path: string): any {
    if (!path) return obj;
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
  }
};
