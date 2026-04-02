import {IStateAdapter} from '../../types';
import {pathUtils} from '../../utils/path';

/**
 * Object Adapter
 * A simple reference implementation that wraps a plain JS object.
 * It uses a simple listener-based system to track changes by path.
 */
export class ObjectAdapter implements IStateAdapter {
  private listeners = new Map<string, Set<(value: any, set: (nv: any) => void, patch?: (pv: any) => void) => void>>();
  private allListeners = new Set<(path: string, value: any, set: (nv: any) => void, patch?: (pv: any) => void) => void>();

  constructor(private store: any) { }

  getValue(path: string): any {
    return pathUtils.get(this.store, path);
  }

  setValue(path: string, val: any): void {
    const prev = this.getValue(path);
    if (prev === val) return;

    this.store = pathUtils.set(this.store, path, val);
    this.notify(path, val);
  }

  patch(path: string, patchObj: any): void {
    const {nextState, modifiedPaths} = pathUtils.patch(this.store, path, patchObj);
    this.store = nextState;
    
    modifiedPaths.forEach(p => {
      this.notify(p, this.getValue(p));
    });
  }

  subscribe(path: string, callback: (value: any, set: (nv: any) => void, patch?: (pv: any) => void) => void): () => void {
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

  subscribeAll(callback: (path: string, value: any, set: (nv: any) => void, patch?: (pv: any) => void) => void): () => void {
    this.allListeners.add(callback);
    return () => {
      this.allListeners.delete(callback);
    };
  }

  private notify(path: string, value: any) {
    const setter = (nv: any) => this.setValue(path, nv);
    const patcher = (pv: any) => this.patch(path, pv);
    const helpers: [(nv: any) => void, ((pv: any) => void) | undefined] = [setter, typeof value === 'object' ? patcher : undefined];

    // 0. Notify global listeners
    this.allListeners.forEach(cb => cb(path, value, ...helpers));

    // 1. Notify exact path listeners
    this.listeners.get(path)?.forEach(cb => cb(value, ...helpers));

    // 2. Notify parent paths (bubbling)
    let currentPath = path;
    while (currentPath.includes('.')) {
      currentPath = currentPath.substring(0, currentPath.lastIndexOf('.'));
      const val = this.getValue(currentPath);
      const s = (nv: any) => this.setValue(currentPath, nv);
      const p = (pv: any) => this.patch(currentPath, pv);
      this.listeners.get(currentPath)?.forEach(cb => cb(val, s, typeof val === 'object' ? p : undefined));
    }

    // 3. Notify children (cascading)
    for (const [registeredPath, set] of this.listeners.entries()) {
      if (registeredPath.startsWith(path + '.')) {
        const val = this.getValue(registeredPath);
        const s = (nv: any) => this.setValue(registeredPath, nv);
        const p = (pv: any) => this.patch(registeredPath, pv);
        set.forEach(cb => cb(val, s, typeof val === 'object' ? p : undefined));
      }
    }
  }
}
