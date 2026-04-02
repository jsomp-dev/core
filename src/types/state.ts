import type {ZodType} from 'zod';
import {IJsompNode} from './node';

/**
 * Atomic state object interface (Observer)
 */
export interface IJsompAtom<T = any> {
  value: T;
  schema?: ZodType | any; // Storage for Zod or other validators
  subscribe(callback: (value: T, set: (newValue: T) => void, patch?: (partial: Partial<T>) => void) => void): () => void;
  set(newValue: T): void;
  /** Execute manual validation and return result */
  validate?(value: any): {success: boolean; error?: any};
}

/**
 * Atomic state value type
 */
export type IAtomValue =
  | (Partial<IJsompNode> & {
    onEvent?: Record<string, Function>;
    value?: any; // Used for simple value binding, e.g. {{isLoading}}
    [key: string]: any;
  })
  | string
  | number
  | boolean
  | null;

/**
 * Atomic state registry interface
 */
export interface IAtomRegistry {
  get(key: string): IJsompAtom | IAtomValue | undefined;
  set(key: string, value: IJsompAtom | IAtomValue | undefined): void;
  patch(key: string, patchObj: any): void;
  batchSet(updates: Record<string, IJsompAtom | IAtomValue | undefined>): void;
  subscribe<T = any>(key: string, callback: (value: T, set: (newValue: T) => void, patch?: (partial: Partial<T>) => void) => void): () => void;
  subscribeAll(callback: (key: string, value: any, set: (newValue: any) => void, patch?: (partial: any) => void) => void): () => void;
  /**
   * Get the current version of the registry or a specific atom
   * Used for cache invalidation.
   */
  version?(key?: string): number;

  /**
   * Get the current snapshot (plain object) of a specific path (V1.1).
   */
  getSnapshot?(key?: string): any;

  // --- Dispatcher Extensions ---
  mount?(namespace: string, registry: IAtomRegistry): void;
  use?(registry: IAtomRegistry): void;
  /**
   * Clear all entries and listeners in the registry.
   */
  clear(): void;
}

/**
 * Dispatcher Registry Interface
 * Extends AtomRegistry with multi-store orchestration capabilities.
 */
export interface IStateDispatcherRegistry extends IAtomRegistry {
  /**
   * Mount a registry to a specific namespace (Plan A)
   */
  mount(namespace: string, registry: IAtomRegistry): this;

  /**
   * Register an ambient fallback registry (Plan B)
   */
  use(registry: IAtomRegistry): this;
}

/**
 * Global Schema Registry for Atoms
 */
export interface ISchemaRegistry {
  /** Global validation toggle */
  enabled: boolean;
  /** Register a schema for a specific ID or Type */
  register(key: string, schema: ZodType | any): void;
  /** Get a schema by ID or Type */
  get(key: string): ZodType | any | undefined;
  /** Export all registered schemas metadata */
  getManifest(): Record<string, any>;
}

/**
 * State adapter interface
 * Used to shield differences between various state libraries
 */
export interface IStateAdapter {
  /** 
   * Path-based value acquisition
   * Support lodash.get style depth path analysis 
   */
  getValue(path: string): any;

  /** 
   * [Optional] Perform status update
   * If Store is read-only, this method can be not implemented
   */
  setValue?(path: string, val: any): void;

  /**
   * [Optional] Perform patch update
   */
  patch?(path: string, patchObj: any): void;

  /** 
   * Path-based subscription logic
   * Ensure only the target Path or its sub-path change triggers callback
   */
  subscribe<T = any>(path: string, callback: (value: T, set: (newValue: T) => void, patch?: (partial: Partial<T>) => void) => void): () => void;

  /**
   * [Optional] Subscribe to all changes in the store
   */
  subscribeAll?(callback: (path: string, value: any, set: (newValue: any) => void, patch?: (partial: any) => void) => void): () => void;
}
