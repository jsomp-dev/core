import {IAtomRegistry} from '../types';

/**
 * Creates a proxy that tracks its path and performs updates through a registry.
 * Used for "Magic" state updates in Action handlers or Proxy-based hooks.
 */
export function createPathAwareProxy(
  registry: IAtomRegistry, 
  path: string, 
  onAccess?: (path: string) => void
) {
  const value = registry.getSnapshot!(path);

  if (value !== null && typeof value === 'object') {
    return new Proxy(value, {
      get(target, key) {
        if (typeof key !== 'string') return (target as any)[key];

        // Custom properties for internal use
        if (key === '__isProxy') return true;
        if (key === '__path') return path;
        if (key === 'toJSON' || key === 'toJS') return () => registry.getSnapshot!(path);
        if (key === 'toString') return () => String(registry.getSnapshot!(path));
        if (key === 'valueOf') return () => registry.getSnapshot!(path);

        const fullPath = `${path}.${key}`;
        if (onAccess) onAccess(fullPath);

        // Handle array methods
        if (Array.isArray(target) && typeof (target as any)[key] === 'function') {
          const mutationMethods = ['push', 'pop', 'shift', 'unshift', 'splice', 'sort', 'reverse'];
          if (mutationMethods.includes(key)) {
            return (...args: any[]) => {
              const latest = registry.getSnapshot!(path) || [];
              const arr = Array.isArray(latest) ? [...latest] : [];
              const result = (arr as any)[key](...args);
              registry.set(path, arr);
              return result;
            };
          }
        }

        // Recursive access
        return createPathAwareProxy(registry, fullPath, onAccess);
      },

      set(target, key, val) {
        if (typeof key !== 'string') return false;
        
        // Optimize: skip if same
        const fullPath = `${path}.${key}`;
        if (registry.getSnapshot!(fullPath) === val) return true;

        registry.set(fullPath, val);
        return true;
      },
      
      deleteProperty(target, key) {
        if (typeof key !== 'string') return false;
        registry.set(`${path}.${key}`, undefined);
        return true;
      }
    });
  }

  return value;
}

/**
 * Creates the root atoms proxy for Action handlers.
 * Maps local aliases to registry paths and wraps them in path-aware proxies.
 */
export function createActionAtomsProxy(registry: IAtomRegistry, mapping: Record<string, string | {path: string, default?: any}>) {
  return new Proxy({}, {
    get(_, key) {
      if (typeof key !== 'string') return undefined;
      const entry = mapping[key];
      if (!entry) return undefined;

      const realPath = typeof entry === 'string' ? entry : entry.path;
      const defaultValue = typeof entry === 'string' ? undefined : entry.default;

      const val = createPathAwareProxy(registry, realPath);
      
      // If result is undefined and we have a default value, return the default
      if (val === undefined) return defaultValue;
      return val;
    },
    set(_, key, val) {
      if (typeof key !== 'string') return false;
      const entry = mapping[key];
      if (!entry) return false;
      
      const realPath = typeof entry === 'string' ? entry : entry.path;
      
      // Direct set on the aliased path
      registry.set(realPath, val);
      return true;
    }
  });
}
