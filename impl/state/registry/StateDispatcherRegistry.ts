import {IAtomRegistry, IAtomValue, IStateDispatcherRegistry, IJsompAtom} from '../../../types';

/**
 * Smart Dispatcher Registry
 * Implements a hybrid strategy for state access:
 * 1. Namespace Mounting (Plan A): Route via prefix, e.g., "ext.user.name"
 * 2. Ambient Fallback (Plan B): Cascade search through multiple stores if local key is missing.
 */
export class StateDispatcherRegistry implements IStateDispatcherRegistry {
  private namespaces = new Map<string, IAtomRegistry>();
  private ambients: IAtomRegistry[] = [];

  constructor(private defaultRegistry: IAtomRegistry) { }

  /**
   * Plan A: Mount a registry to a specific namespace.
   * Usage: dispatcher.mount("ext", zustandRegistry) 
   * Then access via {{ext.profile.name}}
   */
  mount(namespace: string, registry: IAtomRegistry): this {
    this.namespaces.set(namespace, registry);
    return this;
  }

  /**
   * Plan B: Register an ambient fallback registry.
   * Usage: dispatcher.use(zustandRegistry)
   * Then access via {{profile.name}} directly.
   */
  use(registry: IAtomRegistry): this {
    if (!this.ambients.includes(registry)) {
      this.ambients.push(registry);
    }
    return this;
  }

  /**
   * Resolve which registry should handle the given key.
   */
  private resolve(key: string): {registry: IAtomRegistry, targetKey: string} | null {
    // 1. Check Namespace (Plan A)
    // We look for the first dot to identify a potential namespace
    if (key.includes('.')) {
      const dotIndex = key.indexOf('.');
      const ns = key.substring(0, dotIndex);
      const subKey = key.substring(dotIndex + 1);

      const registry = this.namespaces.get(ns);
      if (registry) {
        return {registry, targetKey: subKey};
      }
    }

    // 2. Check Protocol Escape Hatch (Legacy compatibility, e.g., "external://")
    if (key.includes('://')) {
      const parts = key.split('://');
      const prefix = parts[0];
      const subKey = parts.slice(1).join('://');
      const registry = this.namespaces.get(prefix);
      if (registry) {
        return {registry, targetKey: subKey};
      }
    }

    // 3. Local/Default Registry
    // If we are getting a value, we might want to cascade. 
    // But for SET/SUBSCRIBE, we need a definitive target.
    return {registry: this.defaultRegistry, targetKey: key};
  }

  get(key: string): IJsompAtom | IAtomValue | undefined {
    // 1. Explicit Namespace Routing (e.g., ext.xxx)
    const resolved = this.resolve(key);
    if (resolved && resolved.registry !== this.defaultRegistry) {
      const val = resolved.registry.get(resolved.targetKey);
      if (val !== undefined) return val;
    }

    // 2. Local Scope Priority
    const local = this.defaultRegistry.get(key);
    if (local !== undefined) {
      return local;
    }

    // 3. Ambient Waterfall (Plan B)
    for (const registry of this.ambients) {
      const atom = registry.get(key);
      if (atom !== undefined) {
        // Verification: If it's an atom, it must have a non-undefined value.
        // If it's a raw value, it must not be undefined.
        const val = (atom && typeof atom === 'object' && 'value' in atom)
          ? (atom as any).value
          : atom;

        if (val !== undefined) return atom;
      }
    }

    return undefined;
  }

  set(key: string, value: IJsompAtom | IAtomValue | undefined): void {
    const resolved = this.resolve(key);
    if (resolved) {
      resolved.registry.set(resolved.targetKey, value);
    }
  }

  batchSet(updates: Record<string, IJsompAtom | IAtomValue | undefined>): void {
    Object.entries(updates).forEach(([k, v]) => this.set(k, v));
  }

  subscribe(key: string, callback: () => void): () => void {
    const resolved = this.resolve(key);

    // We subscribe to the resolved registry
    const unsubs: (() => void)[] = [];

    if (resolved) {
      unsubs.push(resolved.registry.subscribe(resolved.targetKey, callback));
    }

    // For Ambient (Plan B), we might need to subscribe to all ambients 
    // because we don't know where the key might appear later.
    for (const registry of this.ambients) {
      unsubs.push(registry.subscribe(key, callback));
    }

    return () => unsubs.forEach(unsub => unsub());
  }
}
