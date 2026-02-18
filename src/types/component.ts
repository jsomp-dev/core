/**
 * Component property description (for TOON compression)
 */
export interface IComponentProp {
  name: string;
  type: string;
  desc?: string;
  def?: any;
}

/**
 * Component synchronization trait (for Auto-Sync)
 */
export interface ISyncTrait {
  /** Property to bind (e.g. 'value', 'checked') */
  prop: string;
  /** Primary event to trigger sync (e.g. 'onChange', 'onValueChange') */
  event: string;
  /** 
   * Data extraction strategy 
   * - 'value': Use the first argument as the value
   * - 'target.value': Use e.target.value
   * - 'target.checked': Use e.target.checked
   * - (args) => any: Custom function to extract value from event arguments
   */
  extract: 'value' | 'target.value' | 'target.checked' | ((...args: any[]) => any);
  /** Whether the event handler is mandatory to prevent component crash */
  required?: boolean;
}

/**
 * Component metadata
 */
export interface IComponentMeta {
  desc?: string;
  props?: IComponentProp[];
  events?: string[];
  slots?: string[];
  /** Auto-Sync configuration */
  sync?: ISyncTrait[];
}

/**
 * Component registry interface
 */
export interface IComponentRegistry {
  /** Register components and their metadata */
  register(name: string, component: any, meta?: IComponentMeta): void;

  /** Get runtime components */
  get(name: string): any | undefined;

  /** Get component metadata */
  getMeta(name: string): IComponentMeta | undefined;

  /** Export Manifest */
  getManifest(): Record<string, IComponentMeta>;
}
