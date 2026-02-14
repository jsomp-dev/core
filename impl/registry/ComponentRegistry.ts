import {IComponentMeta, IComponentRegistry} from '../../types';

/**
 * Component entry
 */
interface IComponentEntry {
  component: any;
  meta?: IComponentMeta;
}

/**
 * Component Registry Implementation
 * Responsibility: Manage component references and metadata for AI protocol export.
 */
export class ComponentRegistry implements IComponentRegistry {
  private registry = new Map<string, IComponentEntry>();

  /**
   * Register component and its metadata
   */
  public register(name: string, component: any, meta?: IComponentMeta): void {
    this.registry.set(name, {
      component,
      meta
    });
  }

  /**
   * Get runtime component
   */
  public get(name: string): any | undefined {
    return this.registry.get(name)?.component;
  }

  /**
   * Get component metadata
   */
  public getMeta(name: string): IComponentMeta | undefined {
    return this.registry.get(name)?.meta;
  }

  /**
   * Export manifest for TOON
   * Result is a dictionary mapping names to metadata for AI processing.
   */
  public getManifest(): Record<string, IComponentMeta> {
    const manifest: Record<string, IComponentMeta> = {};
    this.registry.forEach((entry, name) => {
      if (entry.meta) {
        manifest[name] = entry.meta;
      }
    });
    return manifest;
  }
}
