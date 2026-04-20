import {IInstanceRegistry, IRuntimeAdapter} from '../types';

/**
 * Symbol used to mark an instance as being hosted on a remote renderer.
 */
export const REMOTE_INSTANCE = Symbol('REMOTE_INSTANCE');

/**
 * InstanceRegistry
 * Implements IInstanceRegistry to manage physical component instances.
 * Supports subscription to instance availability and smart Proxy access.
 */
export class InstanceRegistry implements IInstanceRegistry {
  private _instances = new Map<string, any>();
  private _pathToId = new Map<string, string>();
  private _listeners = new Map<string, Set<(instance: any) => void>>();
  private _adapter?: IRuntimeAdapter;

  /**
   * Set the runtime adapter to enable remote method invocation.
   */
  public setAdapter(adapter: IRuntimeAdapter): void {
    this._adapter = adapter;
  }

  public set(id: string, instance: any, path?: string): void {
    const oldInstance = this._instances.get(id);
    if (oldInstance === instance) return;

    if (instance === null || instance === undefined) {
      this._instances.delete(id);
      if (path) this._pathToId.delete(path);
    } else {
      this._instances.set(id, instance);
      if (path) this._pathToId.set(path, id);
    }

    this._notify(id, instance);
  }

  /**
   * Get the component instance.
   * - Local Mode: Returns the raw physical instance (HTMLElement/Object).
   * - Remote Mode: Returns a Smart Proxy that routes calls via the adapter.
   */
  public get<T = any>(idOrPath: string, contextPath?: string): T | undefined {
    const id = this._resolveId(idOrPath, contextPath);
    const instance = this._instances.get(id);
    if (!instance) return undefined;

    // 1. Local Mode: Return raw instance directly for best performance and compatibility
    if (instance !== REMOTE_INSTANCE) {
      return instance as T;
    }

    // 2. Remote Mode: Return a Command Proxy
    const adapter = this._adapter;
    return new Proxy({}, {
      get: (target, prop) => {
        // Handle special metadata
        if (prop === '__jsomp_id') return id;
        if (prop === '__jsomp_is_remote') return true;
        if (prop === '__jsomp_raw') return null;

        // Route method calls to adapter
        if (typeof prop === 'string' && adapter) {
          return (...args: any[]) => {
            return adapter.invokeMethod(id, prop, args);
          };
        }
        return undefined;
      }
    }) as T;
  }

  public getRaw<T = any>(idOrPath: string, contextPath?: string): T | undefined {
    const id = this._resolveId(idOrPath, contextPath);
    return this._instances.get(id) as T;
  }

  /**
   * Resolves an ID or Path using hierarchical backoff if contextPath is provided.
   */
  private _resolveId(idOrPath: string, contextPath?: string): string {
    // 1. Try direct ID or Path lookup first (O(1))
    if (this._instances.has(idOrPath)) return idOrPath;
    if (this._pathToId.has(idOrPath)) return this._pathToId.get(idOrPath)!;

    // 2. If we have a context path, perform hierarchical backoff
    if (contextPath) {
      const parts = contextPath.split('.');
      while (parts.length > 0) {
        const potentialPath = `${parts.join('.')}.${idOrPath}`;
        if (this._pathToId.has(potentialPath)) {
          return this._pathToId.get(potentialPath)!;
        }
        if (this._instances.has(potentialPath)) {
          return potentialPath;
        }
        parts.pop(); // Backoff to parent
      }
    }

    // 3. Final fallback: return original string (might be a global ID)
    return idOrPath;
  }

  public remove(id: string): void {
    if (this._instances.has(id)) {
      this._instances.delete(id);
      // Note: Full path cleanup might require reverse mapping or explicit path passed to remove
      // For now, we mainly rely on set(id, null, path) from the renderer
      this._notify(id, null);
    }
  }

  public on(id: string, callback: (instance: any) => void): () => void {
    if (!this._listeners.has(id)) {
      this._listeners.set(id, new Set());
    }
    this._listeners.get(id)!.add(callback);

    // If instance already exists, trigger callback immediately
    if (this._instances.has(id)) {
      // For subscribers, we provide the smart proxy
      callback(this.get(id));
    }

    return () => {
      const listeners = this._listeners.get(id);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this._listeners.delete(id);
        }
      }
    };
  }

  public clear(): void {
    const ids = Array.from(this._instances.keys());
    this._instances.clear();
    this._pathToId.clear();
    ids.forEach(id => this._notify(id, null));
    this._listeners.clear();
  }

  public getIds(): string[] {
    return Array.from(this._instances.keys());
  }

  public getPaths(): string[] {
    return Array.from(this._pathToId.keys());
  }

  private _notify(id: string, instance: any): void {
    const listeners = this._listeners.get(id);
    if (listeners) {
      // When notifying, we create the proxy once
      const proxy = instance ? this.get(id) : null;
      listeners.forEach(callback => {
        try {
          callback(proxy);
        } catch (e) {
          console.error(`[InstanceRegistry] Error in listener for ${id}:`, e);
        }
      });
    }
  }
}
