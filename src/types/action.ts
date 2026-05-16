import type {IAtomRegistry} from './state';

/**
 * Action Requirement Type for Atoms (supports path and default value for inference)
 */
export interface IActionAtomRequirement<T = any> {
  path: string;
  default?: T;
}

/**
 * Action Definition (Schema + Handler)
 */
export interface IActionDef<TAtoms extends Record<string, any> = any> {
  /** Environmental requirements (Atoms, Props, Event Params) */
  require?: {
    /** Alias mapping for atom access: { "localName": "path" or {path: "...", default: 0} } */
    atoms?: {[K in keyof TAtoms]: string | IActionAtomRequirement<TAtoms[K]>};
    /** Property requirements (with Zod or simple string keys) */
    props?: Record<string, any>;
    /** Event parameter expectations */
    eventParams?: Record<string, any>;
  };
  /** Logic execution body */
  handler: (env: {
    /** Resolved atoms (mapped via aliases) */
    atoms: TAtoms;
    /** Original node props */
    props: Record<string, any>;
    /** Payload from the triggered event */
    event: any;
    /** Alias for the raw event payload (V1.2+) */
    originEvent: any;
    /** The original trigger that fired this action (e.g., 'dom:click') */
    trigger: string;
    /** Trigger namespace (e.g., 'dom') */
    namespace: string;
    /** The topology path of the node that triggered this action */
    contextPath: string;
    /** Unqualified event name (e.g., 'click') */
    eventName: string;
  }) => void | Promise<void>;
}

/**
 * Action Plugin Function
 */
export type IActionPlugin = (env: any, registry: IActionRegistry) => void | Promise<void>;

/**
 * Action Source Metadata
 */
export interface IActionSourceMeta {
  /** The namespace of the source */
  namespace: string;
  /** The name of the source event (without namespace prefix) */
  name: string;
}

/**
 * Trigger Source Interface (V1.2+)
 * Responsibility: Bridge external/custom event sources to JSOMP actions.
 */
export interface ITriggerSource {
  /**
   * Establish a real connection to the external event source.
   * @param eventName Neutral event name (e.g., 'receive_msg')
   * @param emit Function to trigger the action with a payload
   * @param sourceMeta Metadata about the source
   * @returns Unsubscribe function
   */
  subscribe(eventName: string, emit: (payload: any) => void, sourceMeta: IActionSourceMeta): (() => void);
}

interface ISignalNamespaceMapping {
  [eventName: string]: (emit: (payload: any) => void) => (() => void);
}

/**
 * Namespace-level emit function.
 * Emits an event to a specific channel under the namespace.
 * @param eventName - Event name (without namespace prefix)
 * @param payload - Event payload
 */
export type NamespaceEmitFunction = (eventName: string, payload: any) => void;

/**
 * Signal Mapping Definition
 * Defines how a custom namespace bridges events to JSOMP.
 * Two mutually exclusive patterns:
 * - `mapping`: Per-event subscription mapping — each event name has its own subscribe function.
 * - `subscribe`: Namespace-level subscription handler — a single function bridges a third-party
 *   event system (e.g., Electron IPC, WebSocket) to the entire namespace.
 *   The emit function takes (eventName, payload) and routes to 'namespace:eventName'.
 */
export interface ISignalMappingDef {
  /** Per-event subscription mapping */
  mapping?: ISignalNamespaceMapping;
  /**
   * Namespace-level subscription handler.
   * Called once to bridge a third-party event system to JSOMP under this namespace.
   * The emit function can emit to any event under the namespace.
   */
  subscribe?: (emit: NamespaceEmitFunction) => (() => void);
}

/**
 * Action Registry Interface
 */
export interface IActionRegistry {
  /**
   * Register a semantic action
   * @param name Action tag name
   * @param def Action definition object or shorthand handler function
   */
  register<TAtoms extends Record<string, any> = any>(
    name: string,
    def: IActionDef<TAtoms> | IActionDef<TAtoms>['handler']
  ): void;

  /** Execute an action by tag name */
  execute(tagName: string, env: any, trigger?: string): Promise<void>;

  /** Bind an atom registry for path resolution in execute() */
  setAtomRegistry(registry: IAtomRegistry): void;

  /** Get a list of all registered action names */
  getNames(): string[];

  /**
   * Register a trigger source for a specific trigger namespace (V1.2+)
   * @deprecated Use EventBus instead. EventBus provides unified event routing
   *             with registerChannel/subscribe/emit/bindSignal APIs.
   *             This method is kept for backward compatibility and will be removed in a future version.
   * @example registerTriggerSource('backend', new MyElectronSource())
   */
  registerTriggerSource(namespace: string, source: ITriggerSource): void;

  /**
   * Get the trigger source for a specific trigger namespace.
   * @deprecated Use EventBus instead. EventBus provides unified event routing
   *             with registerChannel/subscribe/emit/bindSignal APIs.
   *             This method is kept for backward compatibility and will be removed in a future version.
   */
  getTriggerSource(namespace: string): ITriggerSource | undefined;

  /**
   * Register a signal mapping for a custom namespace.
   * Two patterns:
   * - `mapping`: Per-event subscriptions — each event name gets its own subscribe function.
   * - `subscribe`: Namespace-level subscription — a single function bridges a third-party
   *   event system (e.g., Electron IPC, WebSocket) to the entire namespace.
   * @param namespace Namespace identifier (e.g., 'runtime')
   * @param mappingDef Signal mapping definition
   * @example
   * jsomp.actions.registerSignalMapping('runtime', {
   *   mapping: {
   *     system_notify: (emit) => {
   *       listeners.add(emit);
   *       return () => listeners.delete(emit);
   *     }
   *   }
   * });
   */
  registerSignalMapping(namespace: string, mappingDef: ISignalMappingDef): void;

  /**
   * Get the signal mapping definition for a specific namespace.
   */
  getSignalMapping(namespace: string): ISignalMappingDef | undefined;

  /** Get an action definition by name */
  getDefinition(name: string): IActionDef<any> | undefined;
}
