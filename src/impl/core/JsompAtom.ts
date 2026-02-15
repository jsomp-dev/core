/**
 * Core Atomic State Class (JsompAtom)
 * This is a pure logic layer object that can be created and manipulated anywhere (Service, Logic, Store).
 */
export class JsompAtom<T = any> {
  private _value: T;
  private listeners = new Set<() => void>();

  constructor(initialValue: T) {
    this._value = initialValue;
  }

  /** Get current value */
  get value(): T {
    return this._value;
  }

  /** Update value and notify all subscribers */
  set(newValue: T) {
    if (this._value === newValue) return;
    this._value = newValue;
    this.notify();
  }

  /** Subscribe to changes */
  subscribe(callback: () => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  /** Compatibility method: returns snapshot for direct usage as plain object */
  getSnapshot() {
    return this._value;
  }
}
