/**
 * Host Adapter Interface
 * Responsibility: Map neutral JSOMP concepts to framework-specific implementations.
 */
export interface IHostAdapter {
  /** Host identifier (e.g. 'react', 'vue') */
  readonly target: string;

  /** 
   * Check if this host owns the specific namespace (e.g., 'dom', 'key').
   * If owned, the host is responsible for mapping it.
   */
  isOwner(namespace: string): boolean;

  /** 
   * Map a neutral trigger name to a framework-specific property name.
   * @example mapPropName('dom', 'click') -> 'onClick' (React)
   */
  mapPropName(namespace: string, eventName: string): string;

  /**
   * Optional: Wrap the original handler with host-specific logic (e.g., Keyboard Filtering)
   */
  wrapHandler?(namespace: string, eventName: string, original: Function): Function | Promise<Function>;
}

/**
 * Host Registry Interface
 */
export interface IHostRegistry {
  /** Register a host adapter */
  register(target: string, adapter: IHostAdapter): void;

  /** Get a host adapter by target ID */
  get(target: string): IHostAdapter | undefined;

  /** Get the current active host from environment config */
  getActive(): IHostAdapter;

  /** Set the current active host */
  setActive(target: string): void;
}
