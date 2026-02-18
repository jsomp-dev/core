/**
 * Action Definition (Schema + Handler)
 */
export interface IActionDef {
  /** Environmental requirements (Atoms, Props, Event Params) */
  require?: {
    /** Alias mapping for atom access: { "localName": "actual.atom.path" } */
    atoms?: Record<string, string>;
    /** Property requirements (with Zod or simple string keys) */
    props?: Record<string, any>;
    /** Event parameter expectations */
    eventParams?: Record<string, any>;
  };
  /** Logic execution body */
  handler: (env: {
    /** Resolved atoms (mapped via aliases) */
    atoms: Record<string, any>;
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
  register(
    name: string,
    def: IActionDef | ((env: {
      atoms: Record<string, any>;
      props: Record<string, any>;
      event: any
    }) => void | Promise<void>)
  ): void;

  /** Get an action definition by name */
  getDefinition(name: string): IActionDef | undefined;
}
