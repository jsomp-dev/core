import {IAtomRegistry, IAtomValue, IJsompAtom} from '../../../types';

/**
 * Prefix Dispatcher Registry
 * Allows mixing multiple state registries in a single page using prefixes (e.g., "local://", "external://").
 * This enables JSOMP to be "state neutral" and aggregate multiple data sources.
 */
export class PrefixDispatcherRegistry implements IAtomRegistry {
  private registries = new Map<string, IAtomRegistry>();

  constructor(private defaultRegistry: IAtomRegistry) { }

  /**
   * Register a sub-registry with a specific prefix.
   * @param prefix The protocol/prefix part (e.g., "external", "ui", "sys")
   * @param registry The registry instance that will handle keys with this prefix.
   */
  register(prefix: string, registry: IAtomRegistry): void {
    this.registries.set(prefix, registry);
  }

  /**
   * Resolve which registry should handle the given key.
   * If the key contains "://", it attempts to extract the prefix.
   */
  private resolve(key: string): {registry: IAtomRegistry, targetKey: string} {
    if (key.includes('://')) {
      const parts = key.split('://');
      const prefix = parts[0];
      const subKey = parts.slice(1).join('://'); // Rejoin in case of nested protocols

      const registry = this.registries.get(prefix);
      if (registry) {
        return {registry, targetKey: subKey};
      }
    }
    return {registry: this.defaultRegistry, targetKey: key};
  }

  get(key: string): IJsompAtom | IAtomValue | undefined {
    const {registry, targetKey} = this.resolve(key);
    return registry.get(targetKey);
  }

  set(key: string, value: IJsompAtom | IAtomValue | undefined): void {
    const {registry, targetKey} = this.resolve(key);
    registry.set(targetKey, value);
  }

  batchSet(updates: Record<string, IJsompAtom | IAtomValue | undefined>): void {
    // Process each update through the dispatcher
    Object.entries(updates).forEach(([k, v]) => this.set(k, v));
  }

  subscribe(key: string, callback: () => void): () => void {
    const {registry, targetKey} = this.resolve(key);
    return registry.subscribe(targetKey, callback);
  }

  /**
   * Subscribe to all changes from all managed registries
   */
  subscribeAll(callback: (key: string, value: any) => void): () => void {
    const unsubs: (() => void)[] = [];
    unsubs.push(this.defaultRegistry.subscribeAll(callback));
    for (const registry of this.registries.values()) {
      unsubs.push(registry.subscribeAll(callback));
    }
    return () => unsubs.forEach(unsub => unsub());
  }
}
