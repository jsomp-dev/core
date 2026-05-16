import {beforeEach, describe, expect, it, vi} from 'vitest';
import {IJsompNode, jsompEnv, PipelineContext, propsTrait, VisualDescriptor} from '../../src';

describe('Action Tag Neutrality & Mapping', () => {
  let context: PipelineContext;

  beforeEach(async () => {
    // Ensure env is setup with default platform
    if (!jsompEnv.isSetup) {
      await jsompEnv.init({framework: 'fallback'});
    }

    context = {
      registry: {} as any,
      actions: {} as any,
      cache: new Map()
    };
  });

  it('should map neutral dom:double_click to onDoubleClick in React', () => {
    const handler = () => { };
    const node: IJsompNode = {
      id: 'n1',
      type: 'button',
      onEvent: {
        'dom:double_click': handler
      }
    };

    const descriptor: VisualDescriptor = {
      id: 'n1',
      componentType: 'button',
      props: {},
      styles: {},
      slots: {}
    };

    propsTrait(node, descriptor, context);

    expect(descriptor.props.onDoubleClick).toBe(handler);
  });

  it('should merge multiple neutral keys mapping to the same prop', async () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();

    const node: IJsompNode = {
      id: 'n2',
      type: 'div',
      onEvent: {
        'key:enter': handler1,
        'key:escape': handler2
      }
    };

    const descriptor: VisualDescriptor = {
      id: 'n2',
      componentType: 'div',
      props: {},
      styles: {},
      slots: {}
    };

    propsTrait(node, descriptor, context);

    expect(descriptor.props.onKeyDown).toBeDefined();

    // Execute combined handler
    await descriptor.props.onKeyDown({key: 'dummy'});

    expect(handler1).toHaveBeenCalled();
    expect(handler2).toHaveBeenCalled();
  });

  it('should route custom namespace events to subscriptions', () => {
    const handler = () => { };
    const node: IJsompNode = {
      id: 'n3',
      type: 'Custom',
      onEvent: {
        'bus:message': handler
      }
    };

    const descriptor: VisualDescriptor = {
      id: 'n3',
      componentType: 'Custom',
      props: {},
      styles: {},
      slots: {}
    };

    propsTrait(node, descriptor, context);

    expect(descriptor.subscriptions).toBeDefined();
    expect(descriptor.subscriptions!.length).toBe(1);
    expect(descriptor.subscriptions![0].channel).toBe('bus:message');
    expect(descriptor.subscriptions![0].handler).toBe(handler);
  });

  it('should support custom namespaces via default rule (onNamespaceEvent)', () => {
    const handler = () => { };
    const node: IJsompNode = {
      id: 'n1',
      type: 'button',
      onEvent: {
        'backend:receive_msg': handler
      }
    };

    const descriptor: VisualDescriptor = {
      id: 'n1',
      componentType: 'button',
      props: {},
      styles: {},
      slots: {}
    };

    propsTrait(node, descriptor, context);

    expect(descriptor.subscriptions).toBeDefined();
    expect(descriptor.subscriptions!.length).toBe(1);
    expect(descriptor.subscriptions![0].channel).toBe('backend:receive_msg');
    expect(descriptor.subscriptions![0].handler).toBe(handler);
  });
});
