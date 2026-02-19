import {IAtomRegistry, IAtomValue, IJsompAtom, IStateAdapter} from '../../types';

/**
 * External State Atom
 * Translates IStateAdapter calls to IJsompAtom interface.
 * This allows external state (Zustand, Redux, etc.) to be treated as first-class Atoms in JSOMP.
 */
export class ExternalStateAtom<T = any> implements IJsompAtom<T> {
  constructor(
    private adapter: IStateAdapter,
    private path: string
  ) { }

  get value(): T {
    return this.adapter.getValue(this.path);
  }

  /**
   * Update the value in the external store.
   * Note: This only works if the adapter implements setValue.
   */
  set(newValue: T): void {
    if (this.adapter.setValue) {
      this.adapter.setValue(this.path, newValue);
    } else {
      console.warn(`[JSOMP] Cannot set value for path "${this.path}": Adapter does not support setValue.`);
    }
  }

  /**
   * Subscribe to changes for this specific path in the external store.
   */
  subscribe(callback: () => void): () => void {
    return this.adapter.subscribe(this.path, callback);
  }
}

/**
 * External State Registry
 * Provides a facade for external state adapters to integrate with JSOMP.
 * It maps JSOMP atom requests (by path/key) to external state via the provided adapter.
 */
export class ExternalStateRegistry implements IAtomRegistry {
  private cache = new Map<string, ExternalStateAtom>();

  constructor(private adapter: IStateAdapter) { }

  /** 
   * Get an atom representing a path in the external store.
   * Atom instances are cached to preserve identity and performance.
   */
  get(key: string): IJsompAtom | IAtomValue | undefined {
    let atom = this.cache.get(key);
    if (!atom) {
      atom = new ExternalStateAtom(this.adapter, key);
      this.cache.set(key, atom);
    }
    return atom;
  }

  /**
   * Update state in the external store.
   * If value is a plain object or IAtomValue, it extracts the content and sets it via the adapter.
   */
  set(key: string, value: IJsompAtom | IAtomValue | undefined): void {
    const targetAtom = this.get(key) as ExternalStateAtom;

    if (value === undefined) return;

    // Check if it's an atom-like object (has subscribe)
    if (typeof value === 'object' && value !== null && 'subscribe' in value) {
      // If it's an atom being passed, we sync its current value to the external store
      targetAtom.set((value as any).value);
    } else {
      // It's a plain value or IAtomValue
      const val = (value as any)?.value !== undefined ? (value as any).value : value;
      targetAtom.set(val);
    }
  }

  /** Batch update multiple keys */
  batchSet(updates: Record<string, IJsompAtom | IAtomValue | undefined>): void {
    Object.entries(updates).forEach(([k, v]) => this.set(k, v));
  }

  /**
   * Subscribe to a path in the external store.
   */
  subscribe(key: string, callback: () => void): () => void {
    return this.adapter.subscribe(key, callback);
  }

  /**
   * Subscribe to all changes in the external store.
   * This is crucial for dynamic node discovery in JsompPage.
   */
  subscribeAll(callback: (key: string, value: any) => void): () => void {
    if (this.adapter.subscribeAll) {
      return this.adapter.subscribeAll(callback);
    }
    // Fallback: If the adapter doesn't support global subscription,
    // we return a no-op to maintain interface compatibility.
    return () => { };
  }

  /**
   * Clear local cache. 
   * Note: This does not clear the external store itself.
   */
  clear(): void {
    this.cache.clear();
  }
}
