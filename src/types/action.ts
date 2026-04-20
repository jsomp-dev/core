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
 * Trigger Source Interface (V1.2+)
 * Responsibility: Bridge external/custom event sources to JSOMP actions.
 */
export interface ITriggerSource {
  /**
   * Establish a real connection to the external event source.
   * @param eventName Neutral event name (e.g., 'receive_msg')
   * @param emit Function to trigger the action with a payload
   * @returns Unsubscribe function
   */
  subscribe(eventName: string, emit: (payload: any) => void): (() => void);
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
  
  /** Get a list of all registered action names */
  getNames(): string[];

  /**
   * Register a trigger source for a specific trigger namespace (V1.2+)
   * @example registerTriggerSource('backend', new MyElectronSource())
   */
  registerTriggerSource(namespace: string, source: ITriggerSource): void;

  /** Get the trigger source for a specific trigger namespace */
  getTriggerSource(namespace: string): ITriggerSource | undefined;

  /** Get an action definition by name */
  getDefinition(name: string): IActionDef<any> | undefined;
}
