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
    atoms?: { [K in keyof TAtoms]: string | IActionAtomRequirement<TAtoms[K]> };
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
  }) => void | Promise<void>;
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

  /** Get an action definition by name */
  getDefinition(name: string): IActionDef<any> | undefined;
}
