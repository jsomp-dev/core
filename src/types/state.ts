import type {ZodType} from 'zod';
import {IJsompNode} from './node';

/**
 * Atomic state object interface (Observer)
 */
export interface IJsompAtom<T = any> {
  value: T;
  schema?: ZodType | any; // Storage for Zod or other validators
  subscribe(callback: () => void): () => void;
  set(newValue: T): void;
  /** Execute manual validation and return result */
  validate?(value: any): {success: boolean; error?: any};
}

/**
 * Atomic state value type
 */
export type IAtomValue = Partial<IJsompNode> & {
  onEvent?: Record<string, Function>;
  value?: any; // Used for simple value binding, e.g. {{isLoading}}
  [key: string]: any;
};

/**
 * Atomic state registry interface
 */
export interface IAtomRegistry {
  get(key: string): IJsompAtom | IAtomValue | undefined;
  set(key: string, value: IJsompAtom | IAtomValue | undefined): void;
  batchSet(updates: Record<string, IJsompAtom | IAtomValue | undefined>): void;
  subscribe(key: string, callback: () => void): () => void;
  subscribeAll(callback: (key: string, value: any) => void): () => void;
  /**
   * Get the current version of the registry or a specific atom
   * Used for cache invalidation.
   */
  version?(key?: string): number;

  // --- Dispatcher Extensions ---
  mount?(namespace: string, registry: IAtomRegistry): void;
  use?(registry: IAtomRegistry): void;
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
   * Path-based subscription logic
   * Ensure only the target Path or its sub-path change triggers callback
   */
  subscribe(path: string, callback: () => void): () => void;

  /**
   * [Optional] Subscribe to all changes in the store
   */
  subscribeAll?(callback: (path: string, value: any) => void): () => void;
}
