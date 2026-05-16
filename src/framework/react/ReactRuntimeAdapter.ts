import {IJsompRuntime} from '../../types';
import {IRenderContext, ISignalCenter, IRuntimeAdapter, PerformanceMetrics, VisualDescriptor, EventSignal, InstanceReadyEvent, ComponentMountEvent} from '../../types';
import {jsompEnv} from '../../JsompEnv';

/**
 * ReactRuntimeAdapter
 * Responsibility: Bridge JsompRuntime to React using useSyncExternalStore pattern.
 * Ensures stable references for zero-diff rendering.
 *
 * Implements IRuntimeAdapter — connects JsompRuntime VisualDescriptor[]
 * to React's reactive rendering system.
 */
export class ReactRuntimeAdapter implements IRuntimeAdapter {
  private _runtime: IJsompRuntime;
  private _lastVersion = -1;
  private _cachedDescriptors: VisualDescriptor[] = [];
  private _descriptorMap = new Map<string, VisualDescriptor>();
  private _listeners = new Set<() => void>();
  public currentContext: IRenderContext;

  constructor(runtime: IJsompRuntime, public signalCenter: ISignalCenter) {
    this._runtime = runtime;
    this.currentContext = {
      components: {},
      pathStack: [],
      slots: {},
      descriptorMap: this._descriptorMap,
      runtimeAdapter: this,
      getStableKey: (id: string) => id // React uses ID as key by default
    };

    // Listen to signal center. 
    signalCenter.subscribe(() => {
      this.notify();
    });
  }

  /**
   * Subscribe implementation for useSyncExternalStore
   */
  public subscribe = (onStoreChange: () => void): (() => void) => {
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
  public getSnapshot(): VisualDescriptor[] {
    const snapshot = this._runtime.getSnapshot();

    // Memoization based on runtime version
    if (snapshot.version !== this._lastVersion) {
      if (snapshot.descriptors) {
        this._cachedDescriptors = snapshot.descriptors;
        // Update descriptor map for O(1) lookups
        this._descriptorMap.clear();
        for (const d of this._cachedDescriptors) {
          this._descriptorMap.set(d.id, d);
        }
      } else {
        this._cachedDescriptors = [];
        this._descriptorMap.clear();
      }
      this._lastVersion = snapshot.version;
    }

    return this._cachedDescriptors;
  }

  /**
   * Get a single descriptor by ID (O(1))
   */
  public getDescriptor(id: string): VisualDescriptor | undefined {
    // Ensure snapshot is up to date
    this.getSnapshot();
    return this._descriptorMap.get(id);
  }

  /**
   * Feed data into runtime and trigger React update
   */
  public feed(entities: Map<string, any>): void {
    this._runtime.feed(entities);
    // Force update because runtime version changed synchronously
    this.notify();
  }

  public getRuntime(): IJsompRuntime {
    return this._runtime;
  }

  /**
   * Access to latest runtime metrics
   */
  public getMetrics(): Partial<PerformanceMetrics> | undefined {
    return this._runtime.getSnapshot().metrics;
  }

  /**
   * Get the current version of the data being rendered
   */
  public getVersion() {
    return this._lastVersion;
  }

  /**
   * Get a stable string representation of root IDs to detect structural changes
   */
  public getRootIdsSnapshot(rootId?: string): string {
    const descriptors = this.getSnapshot();

    const roots: string[] = [];
    for (let i = 0; i < descriptors.length; i++) {
      if (!descriptors[i].parentId) {
        roots.push(descriptors[i].id);
      }
    }

    if (rootId && !roots.includes(rootId)) {
      roots.push(rootId);
    }

    return roots.sort().join(',');
  }

  private _dispatcherCache = new Map<string, Function>();

  /**
   * Get a stable event dispatcher for a specific node and trigger.
   * This prevents React re-renders caused by function reference changes.
   */
  public getEventDispatcher(nodeId: string, trigger: string): Function {
    const key = `${nodeId}:${trigger}`;
    let dispatcher = this._dispatcherCache.get(key);

    if (!dispatcher) {
      dispatcher = (payload: any) => {
        const descriptor = this.getDescriptor(nodeId);
        if (!descriptor || !descriptor.props) return;

        const handler = descriptor.props[trigger];
        if (typeof handler === 'function') {
          handler(payload);
        }
      };
      this._dispatcherCache.set(key, dispatcher);
    }

    return dispatcher;
  }

  public updateContext(partial: Partial<IRenderContext>): void {
    let changed = false;
    for (const key in partial) {
      if ((this.currentContext as any)[key] !== (partial as any)[key]) {
        changed = true;
        break;
      }
    }
    if (changed) {
      this.currentContext = {...this.currentContext, ...partial};
    }
  }

  public getReactiveSource(path: string): any {
    return this.signalCenter.get(path);
  }

  /**
   * Report a component instance (DOM element or object) back to the runtime.
   * Emits instanceReady event through the full lifecycle using emitLifecycle:
   *   WillCommit → (prevent() called) → Aborted
   *   WillCommit → (success) → Finished
   *   Any phase → Error on exception
   */
  public reportInstance(id: string, instance: any, path?: string): void {
    const service = jsompEnv.service;
    if (!service) return;

    (service.events.instanceReady as EventSignal<InstanceReadyEvent>).emitLifecycle({id, instance, path}, () => {
      if (instance != null) {
        service.instances.set(id, instance, path);
      }
    });
  }

  /**
   * Invoke a method on a component instance.
   */
  public async invokeMethod(id: string, methodName: string, args: any[]): Promise<any> {
    const service = jsompEnv.service;
    if (service) {
      const instance = service.instances.getRaw(id);
      if (instance && typeof (instance as any)[methodName] === 'function') {
        return (instance as any)[methodName](...args);
      }
    }
    return undefined;
  }
}

