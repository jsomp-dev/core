import {SchemaRegistry} from '../registry';
import type {ZodType} from 'zod';
import {IJsompAtom} from '../types';
import {jsompEnv} from '../JsompEnv';

/**
 * Core Atomic State Class (JsompAtom)
 * This is a pure logic layer object that can be created and manipulated anywhere (Service, Logic, Store).
 */
export class JsompAtom<T = any> implements IJsompAtom<T> {
  private _value: T;
  private listeners = new Set<() => void>();
  public schema?: ZodType | any;

  constructor(initialValue: T, schema?: ZodType | any) {
    this._value = initialValue;
    this.schema = schema;
  }

  /** Get current value */
  get value(): T {
    return this._value;
  }

  /** Update value and notify all subscribers */
  set(newValue: T) {
    if (this._value === newValue) return;

    // Global toggle + Local schema check
    if (SchemaRegistry.global.enabled && this.schema) {
      const result = this.validate(newValue);
      if (!result.success) {
        jsompEnv.logger.throw('[Atom] Validation failed', result.error, {
          value: newValue,
          error: JSON.stringify(result.error)
        });
      }
    }

    this._value = newValue;
    this.notify();
  }

  /** Execute manual validation and return result */
  validate(value: any): {success: boolean; error?: any} {
    if (!this.schema) return {success: true};

    // Support Zod safeParse
    if (typeof this.schema.safeParse === 'function') {
      const result = this.schema.safeParse(value);
      return {success: result.success, error: result.error};
    }

    // Default to success if no known validator is found
    return {success: true};
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
