import {IStateAdapter} from '../../types';
import {pathUtils} from '../../utils/path';

/**
 * Zustand Adapter
 * Integrates Zustand stores with JSOMP.
 * It shields JSOMP from Zustand specifics by providing a path-based interface.
 */
export class ZustandAdapter implements IStateAdapter {
  /**
   * @param store A Zustand store instance (e.g., the result of create() or a store hook).
   *              Must provide getState() and subscribe() methods.
   */
  constructor(private store: any) { }

  /**
   * Get the current value from the Zustand state at the specified path.
   */
  getValue(path: string): any {
    if (!this.store) return undefined;

    // Support both vanilla store and hook-based store
    const state = typeof this.store.getState === 'function'
      ? this.store.getState()
      : this.store; // Fallback if store itself is the state (though not ideal)

    return pathUtils.get(state, path);
  }

  /**
   * Set a value in the Zustand store at the specified path.
   */
  setValue(path: string, val: any): void {
    if (this.store && typeof this.store.setState === 'function') {
      this.store.setState((state: any) => {
        return pathUtils.set(state, path, val);
      });
    }
  }

  /**
   * Patch an existing state in the Zustand store.
   */
  patch(path: string, patchObj: any): void {
    if (this.store && typeof this.store.setState === 'function') {
      this.store.setState((state: any) => {
        const {nextState} = pathUtils.patch(state, path, patchObj);
        return nextState;
      });
    }
  }

  /**
   * Subscribe to changes for a specific path in the Zustand store.
   * Uses dirty checking to ensure the callback only runs when the specific path's value changes.
   */
  subscribe(path: string, callback: (value: any, set: (nv: any) => void, patch?: (pv: any) => void) => void): () => void {
    let lastValue = this.getValue(path);

    const setter = (nv: any) => this.setValue(path, nv);
    const patcher = (pv: any) => this.patch(path, pv);

    // Subscribe to the whole store and perform a dirty check based on the path.
    return this.store.subscribe((state: any) => {
      const currentValue = pathUtils.get(state, path);
      if (currentValue !== lastValue) {
        lastValue = currentValue;
        callback(currentValue, setter, typeof currentValue === 'object' ? patcher : undefined);
      }
    });
  }

  /**
   * Subscribe to all changes in the Zustand store.
   * Note: This detects changes in top-level keys to support JSOMP node discovery.
   */
  subscribeAll(callback: (key: string, value: any, set: (nv: any) => void, patch?: (pv: any) => void) => void): () => void {
    let lastState = this.store.getState();

    return this.store.subscribe((state: any) => {
      // Basic Diff for top-level keys
      Object.keys(state).forEach(key => {
        if (state[key] !== lastState[key]) {
          const setter = (nv: any) => this.setValue(key, nv);
          const patcher = (pv: any) => this.patch(key, pv);
          callback(key, state[key], setter, typeof state[key] === 'object' ? patcher : undefined);
        }
      });
      lastState = state;
    });
  }
}
