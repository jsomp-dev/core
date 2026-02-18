import {JsompRuntime} from '../../engine';
import {VisualDescriptor, ISignalCenter} from '../../types';

/**
 * ReactAdapter
 * Responsibility: Bridge JsompRuntime to React using useSyncExternalStore pattern.
 * Ensures stable references for zero-diff rendering.
 */
export class ReactAdapter {
  private _runtime: JsompRuntime;
  private _lastVersion = -1;
  private _cachedDescriptors: VisualDescriptor[] = [];
  private _listeners = new Set<() => void>();

  constructor(runtime: JsompRuntime, signalCenter: ISignalCenter) {
    this._runtime = runtime;

    // Listen to signal center. 
    // Since JsompRuntime.reconcile is synchronous within SignalCenter subscription,
    // we can safely assume runtime state is updated when we receive this signal (if registered after runtime).
    // Or even if concurrent, useSyncExternalStore invokes getSnapshot to check consistency.
    signalCenter.subscribe(() => {
      this.notify();
    });
  }

  /**
   * Subscribe implementation for useSyncExternalStore
   */
  public subscribe = (onStoreChange: () => void): () => void => {
    this._listeners.add(onStoreChange);
    return () => {
      this._listeners.delete(onStoreChange);
    };
  };

  /**
   * Notify all React listeners
   */
  private notify() {
    this._listeners.forEach(listener => listener());
  }

  /**
   * Get stable snapshot of descriptors
   */
  public getNodesSnapshot = (): VisualDescriptor[] => {
    const snapshot = this._runtime.getSnapshot();

    // Memoization based on runtime version
    if (snapshot.version !== this._lastVersion) {
      if (snapshot.descriptors) {
        this._cachedDescriptors = snapshot.descriptors;
      } else {
        this._cachedDescriptors = [];
      }
      this._lastVersion = snapshot.version;
    }

    return this._cachedDescriptors;
  };

  /**
   * Feed data into runtime and trigger React update
   */
  public feed(entities: Map<string, any>) {
    this._runtime.feed(entities);
    // Force update because runtime version changed synchronously
    this.notify();
  }

  /**
   * Access to latest runtime metrics
   */
  public getMetrics() {
    return this._runtime.getSnapshot().metrics;
  }

  /**
   * Get the current version of the data being rendered
   */
  public getVersion() {
    return this._lastVersion;
  }
}
