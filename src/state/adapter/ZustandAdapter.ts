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
        // Create a copy of the state to maintain immutability (shallow)
        const nextState = Array.isArray(state) ? [...state] : {...state};
        pathUtils.set(nextState, path, val);
        return nextState;
      });
    }
  }

  /**
   * Subscribe to changes for a specific path in the Zustand store.
   * Uses dirty checking to ensure the callback only runs when the specific path's value changes.
   */
  subscribe(path: string, callback: () => void): () => void {
    let lastValue = this.getValue(path);

    // Subscribe to the whole store and perform a dirty check based on the path.
    return this.store.subscribe((state: any) => {
      const currentValue = pathUtils.get(state, path);
      if (currentValue !== lastValue) {
        lastValue = currentValue;
        callback();
      }
    });
  }

  /**
   * Subscribe to all changes in the Zustand store.
   * Note: This detects changes in top-level keys to support JSOMP node discovery.
   */
  subscribeAll(callback: (key: string, value: any) => void): () => void {
    let lastState = this.store.getState();

    return this.store.subscribe((state: any) => {
      // Basic Diff for top-level keys
      Object.keys(state).forEach(key => {
        if (state[key] !== lastState[key]) {
          callback(key, state[key]);
        }
      });
      lastState = state;
    });
  }
}
