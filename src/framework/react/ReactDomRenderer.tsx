import {Fragment, ReactNode} from 'react';
import {IRenderContext, IRenderer, IRenderRoot, IRuntimeAdapter, VisualDescriptor} from "../../types";
import {ReactRenderRoot} from "./ReactRenderRoot";
import {ReactRuntimeAdapter} from "./ReactRuntimeAdapter";
import {resolveComponent} from "./ReactRenderer";

/**
 * ReactRendererAdapter
 * Factory that implements IRenderer for React.
 * Returns a ReactRenderRoot that manages the React 18 root lifecycle.
 */
export const ReactDomRenderer: IRenderer = {
  name: 'react',

  createRoot(
    adapter: IRuntimeAdapter,
    options?: {
      components?: Record<string, any>;
      stylePresets?: Record<string, any>;
      container?: Element;
    }
  ): IRenderRoot {
    const container = options?.container;
    if (!container) {
      throw new Error('[ReactDomRenderer] container is required');
    }
    const root = new ReactRenderRoot(
      container,
      adapter,
      options?.components || {},
      undefined
    );
    root.mount();
    return root;
  },

  resolve(descriptor: VisualDescriptor, ctx: IRenderContext): any {
    const resolved = resolveComponent(descriptor, ctx);
    if (!resolved) return null;

    const {Component, props, pathStack, slots} = resolved;

    const slotProps: Record<string, ReactNode> = {};
    const children: ReactNode[] = [];

    Object.entries<string[]>(slots).forEach(([name, ids]) => {
      const rendered = ids.map(childId => {
        const childDescriptor = ctx.descriptorMap.get(childId);
        if (!childDescriptor) return null;
        return ReactDomRenderer.resolve(childDescriptor, ctx);
      });

      if (name === 'children' || name === 'default') {
        children.push(...rendered);
      } else {
        slotProps[name] = <Fragment>{rendered}</Fragment>;
      }
    });

    const finalChildren = children.length > 0 ? children : props.children;

    const runtimeAdapter = ctx.runtimeAdapter as ReactRuntimeAdapter;
    runtimeAdapter.updateContext({pathStack, slots});

    return (
      <Component {...props} {...slotProps} style={props.style ?? descriptor?.styles}>
        {finalChildren}
      </Component>
    );
  }
};
