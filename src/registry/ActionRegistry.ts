import {IActionDef, IActionRegistry} from '../types';

export class ActionRegistry implements IActionRegistry {
  private _actions = new Map<string, IActionDef>();

  public register(
    name: string,
    def: IActionDef | ((env: {atoms: Record<string, any>; props: Record<string, any>; event: any}) => void | Promise<void>)
  ): void {
    if (typeof def === 'function') {
      this._actions.set(name, {
        handler: def as any
      });
    } else {
      this._actions.set(name, def);
    }
  }

  public getDefinition(name: string): IActionDef | undefined {
    return this._actions.get(name);
  }
}
