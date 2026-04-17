import type {
  FrameworkManifest,
  IFrameworkAdapter,
  IJsompRuntime,
  IRenderContext,
  IRenderer,
  IRuntimeAdapter,
  ISignalCenter
} from '../../types';
import {KeyboardUtils} from '../../utils/keyboard';

const fallbackManifest: FrameworkManifest = {
  id: 'fallback',
  name: 'Fallback Framework',
  factory: async () => ({createAdapter: () => fallbackAdapter})
};

export const fallbackAdapter: IFrameworkAdapter = {
  manifest: fallbackManifest,
  target: 'fallback',

  isOwner(namespace: string): boolean {
    return namespace === 'dom' || namespace === 'key';
  },

  mapPropName(namespace: string, eventName: string): string {
    if (namespace === 'key') {
      return 'onKeyDown';
    }

    let normalizedName = eventName.toLowerCase();

    if (eventName.startsWith('on')) {
      normalizedName = normalizedName.substring(2);
    }

    const pascalEvent = normalizedName.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
    return `on${pascalEvent}`;
  },

  wrapHandler(namespace: string, eventName: string, original: Function): Function {
    if (namespace === 'key') {
      return (e: KeyboardEvent) => {
        if (KeyboardUtils.isMatch(e, eventName)) {
          e.preventDefault();
          e.stopPropagation();
          (original as any)(e);
        }
      };
    }
    if (namespace === 'dom') {
      return (e: Event) => {
        e?.preventDefault();
        e?.stopPropagation();
        (original as any)(e);
      };
    }
    return original as Function;
  },

  createRuntimeAdapter(
    _id: string,
    _runtime: IJsompRuntime,
    _signalCenter: ISignalCenter,
    _options?: any
  ): IRuntimeAdapter {
    throw new Error('[FallbackFrameworkAdapter] Rendering is not supported. Please use a framework-specific adapter (e.g., React).');
  },

  getRenderer(): IRenderer {
    throw new Error('[FallbackFrameworkAdapter] Rendering is not supported. Please use a framework-specific adapter (e.g., React).');
  },

  getRenderContext(): IRenderContext {
    throw new Error('[FallbackFrameworkAdapter] Rendering is not supported. Please use a framework-specific adapter (e.g., React).');
  }
};

export {fallbackManifest};