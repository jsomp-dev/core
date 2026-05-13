import {IActionDef, IActionRegistry, IAtomRegistry, ITriggerSource} from '../types';
import {createActionAtomsProxy, createMergedAtomsProxy} from '../utils/proxy';

export class ActionRegistry implements IActionRegistry {
  private _actions = new Map<string, IActionDef>();
  private _triggerSources = new Map<string, ITriggerSource>();
  private _atomRegistry?: IAtomRegistry;

  public setAtomRegistry(registry: IAtomRegistry): void {
    this._atomRegistry = registry;
  }

  public register<TAtoms extends Record<string, any> = any>(
    name: string,
    def: IActionDef<TAtoms> | IActionDef<TAtoms>['handler']
  ): void {
    if (typeof def === 'function') {
      this._actions.set(name, {
        handler: def as any
      });
    } else {
      this._actions.set(name, def);
    }
  }

  public async execute(tagName: string, env: any, trigger?: string): Promise<void> {
    const def = this._actions.get(tagName);
    if (!def) return;

    const fullTrigger = trigger || tagName;
    const [ns, eName] = fullTrigger.includes(':') 
      ? fullTrigger.split(':') 
      : ['dom', fullTrigger];

    // Build atoms: base from require mapping + incremental overrides from env.atoms
    let atomsEnv = env.atoms;
    if (def.require?.atoms && this._atomRegistry) {
      const baseAtoms = createActionAtomsProxy(this._atomRegistry, def.require.atoms);
      if (atomsEnv && typeof atomsEnv === 'object' && Object.keys(atomsEnv).length > 0) {
        atomsEnv = createMergedAtomsProxy(baseAtoms, atomsEnv);
      } else {
        atomsEnv = baseAtoms;
      }
    }

    // Build props: base from require keys + incremental overrides from env.props
    let propsEnv = env.props;
    if (def.require?.props) {
      const baseProps: Record<string, any> = {};
      for (const key of Object.keys(def.require.props)) {
        baseProps[key] = undefined;
      }
      if (propsEnv && typeof propsEnv === 'object') {
        propsEnv = {...baseProps, ...propsEnv};
      } else {
        propsEnv = baseProps;
      }
    } else if (!propsEnv || typeof propsEnv !== 'object') {
      propsEnv = {};
    }

    await def.handler({
      atoms: atomsEnv,
      props: propsEnv,
      event: env.event,
      originEvent: env.event,
      trigger: fullTrigger,
      namespace: ns,
      eventName: eName,
      contextPath: env.contextPath || tagName
    });
  }

  public getNames(): string[] {
    return Array.from(this._actions.keys());
  }

  public registerTriggerSource(namespace: string, source: ITriggerSource): void {
    this._triggerSources.set(namespace, source);
  }

  public getTriggerSource(namespace: string): ITriggerSource | undefined {
    return this._triggerSources.get(namespace);
  }

  public getDefinition(name: string): IActionDef<any> | undefined {
    return this._actions.get(name);
  }

  public clear(): void {
    this._actions.clear();
    this._triggerSources.clear();
  }
}
