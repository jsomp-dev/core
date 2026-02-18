
import {IAtomRegistry, IAtomValue, IJsompAtom} from '../types';
import {ISignalCenter} from './types';

/**
 * Signal-to-Registry Adapter
 * Adapts a SignalCenter (raw runtime state) into a standard IAtomRegistry interface.
 * Primarily used by the TraitPipeline to resolve atom values and versions.
 */
export class SignalRegistryAdapter implements IAtomRegistry {
  private _signalCenter: ISignalCenter | null = null;
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

  // --- IAtomRegistry Implementation ---

  public get(key: string): IJsompAtom | IAtomValue | undefined {
    // 1. Try SignalCenter (Primary)
    if (this._signalCenter) {
      return this._signalCenter.get(key);
    }
    // 2. Fallback
    return this._fallbackMap.get(key);
  }

  public set(key: string, value: any): void {
    // In Runtime context, 'set' usually means updating the SignalCenter
    if (this._signalCenter) {
      this._signalCenter.onUpdate(key, value);
    } else {
      this._fallbackMap.set(key, value);
    }
  }

  public batchSet(updates: Record<string, any>): void {
    if (this._signalCenter) {
      for (const [key, value] of Object.entries(updates)) {
        this._signalCenter.onUpdate(key, value);
      }
    } else {
      for (const [key, value] of Object.entries(updates)) {
        this._fallbackMap.set(key, value);
      }
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
