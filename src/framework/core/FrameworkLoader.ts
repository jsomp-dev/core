import {jsompEnv} from '../../JsompEnv';
import type {FrameworkManifest, IFrameworkRegistry, IFrameworkLoader, FrameworkDetectionEnv} from '../../types';

/**
 * Framework loader implementation that handles automatic discovery
 * and initialization of framework adapters.
 */
export class FrameworkLoader implements IFrameworkLoader {
  /**
   * The framework registry instance to register discovered frameworks with.
   */
  private get _registry(): IFrameworkRegistry {
    return jsompEnv.service!.frameworks;
  };

  public readonly capabilityNamespaces = ['dom', 'key'];

  /**
   * Registers all built-in framework manifests that ship with JSOMP.
   * NOTE: This is a no-op since built-in frameworks are now loaded via
   * explicit entry points to support tree-shaking.
   */
  public registerBuiltInFrameworks(...manifests: FrameworkManifest[]): void {
    for (const manifest of manifests) {
      this._registry.registerManifest(manifest);
    }
  }

  /**
   * @superfuture
   * Loads framework adapters from external npm packages.
   * Each package should export a 'jsompFrameworkManifest' as its default export.
   * @param packages - Array of npm package names to load (e.g., ['@jsomp/framework-vue'])
   */
  public async loadExternalFrameworks(packages: string[]): Promise<void> {
    // Do nonthing for now
  }

  /**
   * Automatically detects and selects the best available framework
   * based on detected environment capabilities and framework priorities.
   * @param env - Object describing detected environment features
   * @param env.hasReact - Whether React is detected in the environment
   * @param env.hasVue - Whether Vue is detected in the environment
   * @param env.hasSolid - Whether Solid is detected in the environment
   * @param env.hasPreact - Whether Preact is detected in the environment
   * @returns The identifier of the detected framework (e.g., 'react')
   */
  public async autoDetect(env: FrameworkDetectionEnv): Promise<string> {
    const frameworks = this._registry.getRegisteredFrameworks();

    const manifests = frameworks
      .map(id => this._registry.getManifest(id))
      .filter((m): m is FrameworkManifest => m !== undefined)
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));

    if (env.hasReact) {
      const reactFramework = manifests.find(m => m.id === 'react');
      if (reactFramework) return 'react';
    }

    if (env.hasVue) {
      const vueFramework = manifests.find(m => m.id === 'vue');
      if (vueFramework) return 'vue';
    }

    if (env.hasSolid) {
      const solidFramework = manifests.find(m => m.id === 'solid');
      if (solidFramework) return 'solid';
    }

    return manifests[0]?.id ?? 'react';
  }
}
