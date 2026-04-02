import {IAtomRegistry, IAtomValue, IJsompAtom} from '../types';
import {pathUtils} from '../utils/path';

function isAtom(obj: any): obj is IJsompAtom {
  return obj && typeof obj.subscribe === 'function' && 'value' in obj;
}

/**
 * Atomic State Registry (AtomRegistry)
 * Responsibilities:
 * 1. Manage named atoms for AI Mustache {{key}} syntax references.
 * 2. Manage path atoms for injection logic.
 */
export class AtomRegistry implements IAtomRegistry {
  private atoms = new Map<string, IJsompAtom | IAtomValue>();
  private listeners = new Map<string, Set<(value: any, set: (newValue: any) => void, patch?: (partial: any) => void) => void>>();
  private globalListeners = new Set<(key: string, value: any, set: (newValue: any) => void, patch?: (partial: any) => void) => void>();

  constructor() { }

  /** Get named atom or value (supports deep path) */
  get(key: string): IJsompAtom | IAtomValue | undefined {
    // 1. Check local level (Exact match)
    const local = this.atoms.get(key);
    if (local !== undefined) return local;

    // 2. Check local level (Deep path match) V1.1
    // If key is 'a.b.c', try finding 'a' and traverse
    if (key.includes('.')) {
      const parts = key.split('.');
      const rootKey = parts[0];
      const rootVal = this.atoms.get(rootKey);
      if (rootVal !== undefined) {
        const baseValue = isAtom(rootVal) ? rootVal.value : rootVal;
        const result = pathUtils.get(baseValue, parts.slice(1).join('.'));
        if (result !== undefined) return result;
      }
    }

    return undefined;
  }

  private atomUnsubs = new Map<string, () => void>();

  /** Set/Register a state (Smart update mode) */
  set(key: string, value: IJsompAtom | IAtomValue | undefined) {
    // context.logger.debug("AtomRegistry.set", key, value);

    const prev = this.atoms.get(key);

    // --- [Smart Update Protection] ---
    if (prev && isAtom(prev) && value !== undefined && !isAtom(value)) {
      const nextVal = (value as any).value !== undefined ? (value as any).value : value;
      prev.set(nextVal);
      // Note: atom.set triggers existing subscriptions; 
      // if mapped via atomUnsubs, it triggers local notify automatically.
      this.notifyGlobal(key, nextVal);
      return;
    }

    if (prev === value) return;

    // Cleanup internal subscription of old atom
    this.atomUnsubs.get(key)?.();
    this.atomUnsubs.delete(key);

    if (value === undefined) {
      this.atoms.delete(key);
    } else {
      // V1.1: If it's a deep path (a.b), check if root (a) exists as a plain object.
      // If so, update it directly via pathUtils to maintain structural consistency.
      if (key.includes('.')) {
        const parts = key.split('.');
        const rootKey = parts[0];
        const rootVal = this.atoms.get(rootKey);
        if (rootVal !== undefined && !isAtom(rootVal) && !isAtom(value)) {
          pathUtils.set(rootVal, parts.slice(1).join('.'), value);
          this.notify(key);
          this.notify(rootKey);

          this.notifyGlobal(key, value);
          this.notifyGlobal(rootKey, rootVal);
          return;
        }
      }

      this.atoms.set(key, value);
      // If it's an atom, establish cascading notification
      if (isAtom(value)) {
        this.atomUnsubs.set(key, value.subscribe(() => {
          this.notify(key);
          this.notifyGlobal(key, value.value);
        }));
      }
    }
    this.notify(key);
    this.notifyGlobal(key, value);
  }

  /** Patch an existing state */
  patch(key: string, patchObj: any) {
    const existing = this.get(key);
    if (existing === undefined) {
      this.set(key, patchObj);
      return;
    }

    if (isAtom(existing)) {
      const current = existing.value;
      if (typeof current === 'object' && current !== null && typeof patchObj === 'object' && patchObj !== null) {
        existing.set({...current, ...patchObj});
      } else {
        existing.set(patchObj);
      }
    } else {
      if (typeof existing === 'object' && existing !== null && typeof patchObj === 'object' && patchObj !== null) {
        this.set(key, {...existing, ...patchObj});
      } else {
        this.set(key, patchObj);
      }
    }
  }

  /** Get snapshot (plain object) of a specific path (V1.1) */
  getSnapshot(key?: string): any {
    if (!key) {
      const result: any = {};
      this.atoms.forEach((v, k) => {
        result[k] = isAtom(v) ? v.value : (v && typeof v === 'object' && 'value' in v ? (v as any).value : v);
      });
      return result;
    }

    const val = this.get(key);
    if (val === undefined) return undefined;
    return isAtom(val) ? val.value : (val && typeof val === 'object' && 'value' in val ? (val as any).value : val);
  }

  /** Batch set */
  batchSet(updates: Record<string, IJsompAtom | IAtomValue | undefined>) {
    Object.entries(updates).forEach(([k, v]) => this.set(k, v));
  }

  /** Subscribe to all changes */
  subscribeAll(callback: (key: string, value: any, set: (newValue: any) => void, patch?: (partial: any) => void) => void): () => void {
    this.globalListeners.add(callback);
    return () => this.globalListeners.delete(callback);
  }

  /** Subscribe (Supports local path bubbling) */
  subscribe<T = any>(key: string, callback: (value: T, set: (newValue: T) => void, patch?: (partial: Partial<T>) => void) => void): () => void {
    // 1. Subscribe to local listener
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(callback);

    return () => {
      set?.delete(callback);
    };
  }

  // TODO: Perf Improve
  private notify(key: string) {
    const notifyPath = (k: string) => {
      const callbacks = this.listeners.get(k);
      if (!callbacks) return;

      const value = this.getSnapshot(k);
      const setter = (nv: any) => this.set(k, nv);
      const patcher = (pv: any) => this.patch(k, pv);

      callbacks.forEach(cb => cb(value, setter, typeof value === 'object' ? patcher : undefined));
    };

    // 1. Notify exact match listeners
    notifyPath(key);

    // 2. V1.1: Notify descendant paths (e.g., if 'user' changed, notify 'user.name')
    this.listeners.forEach((_, listenerKey) => {
      if (listenerKey.startsWith(key + '.')) {
        notifyPath(listenerKey);
      }
    });

    // 3. V1.1: Notify ancestor paths (e.g., if 'user.name' changed, notify 'user')
    if (key.includes('.')) {
      const parts = key.split('.');
      for (let i = parts.length - 1; i > 0; i--) {
        const parentKey = parts.slice(0, i).join('.');
        notifyPath(parentKey);
      }
    }
  }

  private notifyGlobal(key: string, value: any) {
    const setter = (nv: any) => this.set(key, nv);
    const patcher = (pv: any) => this.patch(key, pv);
    
    this.globalListeners.forEach(cb => cb(key, value, setter, typeof value === 'object' ? patcher : undefined));
  }

  /**
   * Clear all atoms and local listeners.
   */
  clear() {
    // 1. Unsubscribe from all internal atom listeners
    this.atomUnsubs.forEach(unsub => unsub());
    this.atomUnsubs.clear();

    // 2. Clear local data
    this.atoms.clear();
    this.listeners.clear();

    // 3. Notify global listeners of a complete reset
    this.notifyGlobal('*', undefined);
  }
}
