import {IOrphanTypeRegistry} from '../types/orphan';

/**
 * OrphanTypeRegistry
 *
 * Manages which node types are allowed to exist as orphan roots.
 * Only explicitly registered types (e.g. 'window') pass the filter.
 */
export class OrphanTypeRegistry implements IOrphanTypeRegistry {
  private _allowed = new Set<string>();

  public register(type: string): void {
    if (!type) return;
    this._allowed.add(type);
  }

  public unregister(type: string): void {
    this._allowed.delete(type);
  }

  public isAllowed(type: string): boolean {
    return this._allowed.has(type);
  }

  public getAll(): ReadonlySet<string> {
    return this._allowed;
  }

  public clear(): void {
    this._allowed.clear();
  }
}