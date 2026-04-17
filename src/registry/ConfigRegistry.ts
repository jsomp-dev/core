import {IConfigRegistry, JsompConfig} from '../types/config';

/**
 * Registry for managing JSOMP configuration.
 * Handles default values, deep merging, and path-based retrieval.
 */
export class ConfigRegistry implements IConfigRegistry {
  private _config: JsompConfig = {};

  constructor(initialConfig: JsompConfig = {}) {
    this._config = this.deepClone(initialConfig);
  }

  /**
   * Get a configuration value by key.
   * Supports dot notation (e.g., 'features.enableCache').
   */
  public get<T = any>(key: string, defaultValue?: T): T {
    const parts = key.split('.');
    let current: any = this._config;

    for (const part of parts) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return defaultValue as T;
      }
      current = current[part];
    }

    return (current !== undefined ? current : defaultValue) as T;
  }

  /**
   * Set a configuration value by key.
   * Supports dot notation.
   */
  public set(key: string, value: any): void {
    const parts = key.split('.');
    let current: any = this._config;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || current[part] === null || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }

  /**
   * Register default values for a namespace.
   * Only sets if the value is currently undefined.
   */
  public registerDefaults(key: string, defaults: any): void {
    const current = this.get(key);
    if (current === undefined) {
      this.set(key, this.deepClone(defaults));
    } else if (typeof current === 'object' && typeof defaults === 'object') {
      // Merge defaults into current if both are objects
      this.set(key, this.deepMerge(this.deepClone(defaults), current));
    }
  }

  /**
   * Merge a configuration object into the registry.
   */
  public merge(config: Partial<JsompConfig>): void {
    this._config = this.deepMerge(this._config, this.deepClone(config as any));
  }

  /**
   * Export the entire configuration.
   */
  public all(): JsompConfig {
    return this.deepClone(this._config);
  }

  // --- Helpers ---

  private isPlainObject(item: any): boolean {
    return (
      item !== null &&
      typeof item === 'object' &&
      item.constructor === Object
    );
  }

  private deepMerge(target: any, source: any): any {
    if (!this.isPlainObject(target) || !this.isPlainObject(source)) return source;

    const result = {...target};

    for (const key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        if (this.isPlainObject(source[key])) {
          result[key] = this.deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }

    return result;
  }

  private deepClone<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item)) as any;
    }

    if (!this.isPlainObject(obj)) return obj;

    const result: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = this.deepClone((obj as any)[key]);
      }
    }
    return result as T;
  }
}
