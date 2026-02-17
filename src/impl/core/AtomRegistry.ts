import {IAtomRegistry, IAtomValue, IJsompAtom} from '../../types';
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
  private listeners = new Map<string, Set<() => void>>();
  private globalListeners = new Set<(key: string, value: any) => void>();

  constructor(private parent?: IAtomRegistry) { }

  /** Get named atom or value (supports bubbly lookup) */
  get(key: string): IJsompAtom | IAtomValue | undefined {
    // 1. Check local level first
    const local = this.atoms.get(key);
    if (local !== undefined) return local;

    // 2. If not found locally, check parent level
    return this.parent?.get(key);
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
      return;
    }

    if (prev === value) return;

    // Cleanup internal subscription of old atom
    this.atomUnsubs.get(key)?.();
    this.atomUnsubs.delete(key);

    if (value === undefined) {
      this.atoms.delete(key);
    } else {
      this.atoms.set(key, value);
      // If it's an atom, establish cascading notification
      if (isAtom(value)) {
        this.atomUnsubs.set(key, value.subscribe(() => this.notify(key)));
      }
    }
    this.notify(key);
    this.notifyGlobal(key, value);
  }

  /** Batch set */
  batchSet(updates: Record<string, IJsompAtom | IAtomValue | undefined>) {
    Object.entries(updates).forEach(([k, v]) => this.set(k, v));
  }

  /** Subscribe to all changes */
  subscribeAll(callback: (key: string, value: any) => void): () => void {
    this.globalListeners.add(callback);
    return () => this.globalListeners.delete(callback);
  }

  /** Subscribe (supports hierarchical bubbling) */
  subscribe(key: string, callback: () => void): () => void {
    // 1. Subscribe to local listener
    let set = this.listeners.get(key);
    if (!set) {
      set = new Set();
      this.listeners.set(key, set);
    }
    set.add(callback);

    // 2. Recursively subscribe to parent (ensures parent updates trigger current listeners)
    let unsubParent: (() => void) | undefined;
    if (this.parent) {
      unsubParent = this.parent.subscribe(key, callback);
    }

    return () => {
      set?.delete(callback);
      unsubParent?.();
    };
  }

  private notify(key: string) {
    this.listeners.get(key)?.forEach(cb => cb());
  }

  private notifyGlobal(key: string, value: any) {
    this.globalListeners.forEach(cb => cb(key, value));
  }
}
