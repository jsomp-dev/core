import {JsompEventBus, JsompFlattener, JsompLogger} from './service';

/**
 * JSOMP configuration interface.
 * Supports strongly typed core settings and extensible plugin settings.
 */
export interface JsompConfig {
  /** 
   * Active host environment ID (e.g., 'react', 'vue', 'electron-ipc')
   * @default 'react'
   */
  host?: string;

  /**
   * Logger instance for environment
   */
  logger?: JsompLogger;

  /**
   * Flattener instance for tree manipulation
   */
  flattener?: JsompFlattener;

  /**
   * Event bus for global communication
   */
  eventBus?: JsompEventBus;

  /**
   * Custom compiler plugins to register during setup
   */
  plugins?: any[];

  /**
   * Feature flags to toggle specific logic or enable experimental capabilities.
   */
  features?: JsompFeatures;

  /**
   * Catch-all for additional custom configuration
   */
  [key: string]: any;
}

/**
 * Interface for the configuration registry.
 * Manages defaults, merging, and retrieval of settings.
 */
export interface IConfigRegistry {
  /**
   * Get a configuration value by key.
   * Supports dot notation for nested values (e.g., 'features.enableCache').
   */
  get<T = any>(key: string, defaultValue?: T): T;

  /**
   * Set a configuration value.
   * Note: Current implementation may not trigger reactivity unless extended.
   */
  set(key: string, value: any): void;

  /**
   * Register default values for a specific namespace or root.
   */
  registerDefaults(key: string, defaults: any): void;

  /**
   * Merge a configuration object into the current state.
   */
  merge(config: Partial<JsompConfig>): void;

  /**
   * Get the entire configuration object.
   */
  all(): JsompConfig;
}

/**
 * JSOMP Feature Flags
 */
export interface JsompFeatures {
  /**
   * Control registration of standard built-in plugins.
   * Key is the plugin ID (e.g., 'standard-inherit'), value is boolean.
   */
  standardPlugins?: Record<string, boolean>;

  /**
   * Enable or disable internal performance caching.
   * If strictly false, some plugins like AttributeCache might skip processing.
   * @default true
   */
  enableCache?: boolean;

  /**
   * Enable strict validation for IDs and paths.
   * If true, throw errors on minor inconsistencies.
   * @default false
   */
  strictMode?: boolean;

  /**
   * Catch-all for experimental or plugin-specific feature flags.
   */
  [key: string]: any;
}
