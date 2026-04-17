import {IHostAdapter, IHostRegistry} from '../types';

/**
 * Host Registry Implementation
 */
export class HostRegistry implements IHostRegistry {
  private _hosts = new Map<string, IHostAdapter>();
  private _activeId: string = 'react';

  public register(target: string, adapter: IHostAdapter): void {
    this._hosts.set(target, adapter);
  }

  public get(target: string): IHostAdapter | undefined {
    return this._hosts.get(target);
  }

  public setActive(target: string): void {
    if (!this._hosts.has(target)) {
      throw new Error(`[JSOMP] Host "${target}" is not registered.`);
    }
    this._activeId = target;
  }

  public getActive(): IHostAdapter {
    const host = this._hosts.get(this._activeId);
    if (!host) {
      throw new Error(`[JSOMP] Active host "${this._activeId}" not found in registry.`);
    }
    return host;
  }
}
