import {IActionDef, IActionRegistry, ITriggerSource} from '../types';

export class ActionRegistry implements IActionRegistry {
  private _actions = new Map<string, IActionDef>();
  private _triggerSources = new Map<string, ITriggerSource>();

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

    await def.handler({
      ...env, 
      trigger: fullTrigger,
      namespace: ns,
      eventName: eName,
      originEvent: env.event
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
