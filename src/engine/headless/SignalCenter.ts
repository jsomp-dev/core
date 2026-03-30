import {ISignalCenter} from '../../types';
import {pathUtils} from '../../utils/path';

/**
 * Signal Center (SignalCenter)
 * The core dispatching hub responsible for signal deduplication and asynchronous batching. It acts as the performance gateway of the JSOMP engine, ensuring efficient signal distribution and preventing rendering overloads.
 * 
 * @status Stable
 * @scope Internal
 */
export class SignalCenter implements ISignalCenter {
  private _state: any = {};
  private _dirtyIds = new Set<string>();
  private _isPending = false;
  private _subscribers = new Set<(dirtyIds: string[]) => void>();
  private _versions = new Map<string, number>();

  /**
   * Register a listener for bulk dirty IDs
   */
  public subscribe(callback: (dirtyIds: string[]) => void): () => void {
    this._subscribers.add(callback);
    return () => this._subscribers.delete(callback);
  }

  /**
   * State change notification (Full Update)
   */
  public onUpdate(path: string, newValue: any): void {
    pathUtils.set(this._state, path, newValue);

    // Bubble up: a.b.c -> [a, a.b, a.b.c] are all dirty
    this._bubbleDirty(path);

    this._triggerBatch();
  }

  /**
   * Patch update (Incremental)
   */
  public patch(path: string, patchObj: any): void {
    const modifiedPaths = pathUtils.patch(this._state, path, patchObj);

    if (modifiedPaths.length > 0) {
      modifiedPaths.forEach(p => this._bubbleDirty(p));
      this._triggerBatch();
    }
  }

  /**
   * Access value by path
   */
  public get(path: string): any {
    return pathUtils.get(this._state, path);
  }

  /**
   * Get the current snapshot (plain object) of the state or a specific path (V1.1).
   */
  public getSnapshot(path?: string): any {
    const val = (!path || path === '*') ? this._state : pathUtils.get(this._state, path);
    if (val === undefined) return undefined;
    // For V1.1, return a structured clone or shallow copy if it's an object to prevent leakage?
    // Actually, simple return is fine if the user handles immutability, 
    // but a snapshot usually implies a separate copy.
    if (typeof val === 'object' && val !== null) {
      return Array.isArray(val) ? [...val] : {...val};
    }
    return val;
  }

  /**
   * Get the version of a specific path
   */
  public getVersion(path: string): number {
    // V1.1: If a parent path is updated, the child version should also be considered increased.
    let max = 0;
    pathUtils.segments(path).forEach(p => {
      max = Math.max(max, this._versions.get(p) || 0);
    });
    return max;
  }

  /**
   * Mark path and its ancestors as dirty
   */
  private _bubbleDirty(path: string) {
    pathUtils.segments(path).forEach(p => {
      this._dirtyIds.add(p);
      this._versions.set(p, (this._versions.get(p) || 0) + 1);
    });
  }

  private _triggerBatch(): void {
    if (!this._isPending) {
      this._isPending = true;
      queueMicrotask(() => {
        this.dispatch();
      });
    }
  }

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
}
