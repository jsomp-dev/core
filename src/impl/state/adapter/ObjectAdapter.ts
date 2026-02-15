import {IStateAdapter} from '../../../types';
import {pathUtils} from '../../../utils/path';

/**
 * Object Adapter
 * A simple reference implementation that wraps a plain JS object.
 * It uses a simple listener-based system to track changes by path.
 */
export class ObjectAdapter implements IStateAdapter {
  private listeners = new Map<string, Set<() => void>>();
  private allListeners = new Set<(path: string, value: any) => void>();

  constructor(private store: any) { }

  getValue(path: string): any {
    return pathUtils.get(this.store, path);
  }

  setValue(path: string, val: any): void {
    const prev = this.getValue(path);
    if (prev === val) return;

    pathUtils.set(this.store, path, val);
    this.notify(path, val);
  }

  subscribe(path: string, callback: () => void): () => void {
    let set = this.listeners.get(path);
    if (!set) {
      set = new Set();
      this.listeners.set(path, set);
    }
    set.add(callback);
    return () => {
      set?.delete(callback);
    };
  }

  subscribeAll(callback: (path: string, value: any) => void): () => void {
    this.allListeners.add(callback);
    return () => {
      this.allListeners.delete(callback);
    };
  }

  private notify(path: string, value: any) {
    // 0. Notify global listeners
    this.allListeners.forEach(cb => cb(path, value));

    // 1. Notify exact path listeners
    this.listeners.get(path)?.forEach(cb => cb());

    // 2. Notify parent paths (bubbling)
    // If a.b.c changed, a.b and a also "changed" technically
    let currentPath = path;
    while (currentPath.includes('.')) {
      currentPath = currentPath.substring(0, currentPath.lastIndexOf('.'));
      this.listeners.get(currentPath)?.forEach(cb => cb());
    }

    // 3. Notify children (cascading)
    // If 'a' changed, 'a.b' and 'a.b.c' might have changed.
    for (const [registeredPath, set] of this.listeners.entries()) {
      if (registeredPath.startsWith(path + '.')) {
        set.forEach(cb => cb());
      }
    }
  }
}
