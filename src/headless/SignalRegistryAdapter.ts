import {IAtomRegistry, IAtomValue, IJsompAtom, ISignalCenter} from '../types';

/**
 * Signal-to-Registry Adapter
 * Adapts a SignalCenter (raw runtime state) into a standard IAtomRegistry interface.
 * Primarily used by the TraitPipeline to resolve atom values and versions.
 */
export class SignalRegistryAdapter implements IAtomRegistry {
  private _signalCenter: ISignalCenter | null = null;
  private _externalFallback: IAtomRegistry | null = null;
  /**
   * Fallback values or temporary storage if SignalCenter is not connected.
   * Useful for unit testing or fallback scenarios.
   */
  private _fallbackMap = new Map<string, any>();

  constructor(signalCenter?: ISignalCenter) {
    if (signalCenter) {
      this._signalCenter = signalCenter;
    }
  }

  /**
   * Connect to a SignalCenter source
   */
  public connect(signalCenter: ISignalCenter): void {
    this._signalCenter = signalCenter;
  }

  /**
   * Set an external fallback registry (e.g. from React Props)
   */
  public setExternalFallback(registry: IAtomRegistry | null): void {
    this._externalFallback = registry;
  }

  // --- IAtomRegistry Implementation ---

  public get(key: string): IJsompAtom | IAtomValue | undefined {
    // 1. Try SignalCenter (Primary)
    if (this._signalCenter) {
      const val = this._signalCenter.get(key);
      if (val !== undefined) return val;
    }
    // 2. Try External Fallback
    if (this._externalFallback) {
      const val = this._externalFallback.get(key);
      if (val !== undefined) return val;
    }
    // 3. Persistent Fallback
    return this._fallbackMap.get(key);
  }

  public set(key: string, value: any): void {
    const existing = this.get(key);
    let targetValue = value;

    // Structure Preservation:
    // If existing value is an object with a 'value' property (IAtomValue), 
    // and we are setting a raw value, wrap it to maintain compatibility.
    // This allows lab code like 'registry.get(key).value' to continue working after sync.
    if (
      existing &&
      typeof existing === 'object' &&
      'value' in existing &&
      !(typeof value === 'object' && value !== null && 'value' in value)
    ) {
      targetValue = {...existing as any, value};
    }

    // Propagation:
    // If there is an external fallback registry and it contains this key, 
    // update it directly so the source of truth is consistent.
    if (this._externalFallback && this._externalFallback.get(key) !== undefined) {
      this._externalFallback.set(key, targetValue);
      // Note: No need to manually update signalCenter here if the fallback is 
      // already subscribed by JsompRuntime (which it is).
      return;
    }

    // Standard Runtime Update
    if (this._signalCenter) {
      this._signalCenter.onUpdate(key, targetValue);
    } else {
      this._fallbackMap.set(key, targetValue);
    }
  }

  public batchSet(updates: Record<string, any>): void {
    for (const [key, value] of Object.entries(updates)) {
      this.set(key, value);
    }
  }

  public subscribe(key: string, callback: () => void): () => void {
    // Subscription is not supported in this adapter version.
    // Use SignalCenter.subscribe() for bulk updates instead.
    return () => { };
  }

  public subscribeAll(callback: (key: string, value: any) => void): () => void {
    // Similar to above.
    return () => { };
  }

  /**
   * Versioning extension for Cache
   */
  public version(key?: string): number {
    if (!key) return 0;
    if (this._signalCenter) {
      return this._signalCenter.getVersion(key);
    }
    return 0;
  }
}
