import {ISignalCenter} from '../types';

/**
 * SignalCenter
 * Responsibility: Listen to Atom state, deduplicate signals, and batch processing.
 */
export class SignalCenter implements ISignalCenter {
  private _dirtyIds = new Set<string>();
  private _isPending = false;
  private _subscribers = new Set<(dirtyIds: string[]) => void>();
  private _values = new Map<string, any>();
  private _versions = new Map<string, number>();

  /**
   * Register a listener
   */
  public subscribe(callback: (dirtyIds: string[]) => void): () => void {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /**
   * State change notification
   * Includes: Reference check, static filtering, and asynchronous batching.
   */
  public onUpdate(id: string, newValue: any): void {
    // 1. Reference Check: Only process if newValue !== oldValue
    const oldValue = this._values.get(id);
    if (oldValue === newValue) return;

    // 2. Static Filtering (Removed in V2 to support Primitive Atoms)
    // We allow all values to pass through because they might be data bindings (e.g. strings, numbers)
    // The Runtime will decide if they are structural nodes or just dependencies.

    // Update cached value
    this._values.set(id, newValue);
    // Increment version
    const currentVersion = this._versions.get(id) || 0;
    this._versions.set(id, currentVersion + 1);

    this._dirtyIds.add(id);

    // 3. Asynchronous Batching: Using microtask
    if (!this._isPending) {
      this._isPending = true;
      queueMicrotask(() => {
        this.dispatch();
      });
    }
  }

  /**
   * Dispatch collected signals
   */
  private dispatch(): void {
    if (this._dirtyIds.size === 0) {
      this._isPending = false;
      return;
    }

    const dirtyIdsArray = Array.from(this._dirtyIds);
    this._subscribers.forEach(sub => sub(dirtyIdsArray));

    this._dirtyIds.clear();
    this._isPending = false;
  }

  /**
   * Access the buffered/latest value
   */
  public get(id: string): any {
    return this._values.get(id);
  }

  /**
   * Get the version of a specific atom
   */
  public getVersion(id: string): number {
    return this._versions.get(id) || 0;
  }
}
