import {beforeEach, describe, expect, it, vi} from 'vitest';
import {styleTrait, IJsompNode, PipelineContext, VisualDescriptor} from '../../src';

describe('StyleTrait', () => {
  let context: PipelineContext;
  let descriptor: VisualDescriptor;

  beforeEach(() => {
    descriptor = {
      id: 'test-node',
      componentType: 'div',
      props: {},
      styles: {},
      slots: {}
    };

    context = {
      registry: {
        get: vi.fn((key: string) => {
          if (key === 'primaryColor') return {value: 'red'};
          if (key === 'paddingSize') return {value: 'p-4'};
          if (key === 'isLarge') return {value: 'text-lg'};
          return undefined;
        }),
        set: vi.fn(),
        batchSet: vi.fn(),
        subscribe: vi.fn(),
        subscribeAll: vi.fn(),
        version: vi.fn(),
        clear: vi.fn(),
      },
      actions: {} as any,
      components: {} as any,
      cache: new Map(),
      stylePresets: {
        'btn': 'rounded shadow',
        'primary': ['bg-blue-500', 'text-white']
      }
    };
  });

  it('should handle style_presets correctly', () => {
    const node: IJsompNode = {
      id: 'n1',
      type: 'div',
      style_presets: ['btn', 'primary']
    };

    styleTrait(node, descriptor, context);

    expect(descriptor.props.className).toContain('rounded shadow');
    expect(descriptor.props.className).toContain('bg-blue-500');
    expect(descriptor.props.className).toContain('text-white');
  });

  it('should handle style_tw with bindings', () => {
    const node: IJsompNode = {
      id: 'n1',
      type: 'div',
      style_tw: ['m-2', '{{paddingSize}}', '{{isLarge}}']
    };

    styleTrait(node, descriptor, context);

    expect(descriptor.props.className).toContain('m-2');
    expect(descriptor.props.className).toContain('p-4');
    expect(descriptor.props.className).toContain('text-lg');
  });

  it('should handle style_css with bindings', () => {
    const node: IJsompNode = {
      id: 'n1',
      type: 'div',
      style_css: {
        color: '{{primaryColor}}',
        fontSize: 14,
        margin: '10px'
      }
    };

    styleTrait(node, descriptor, context);

    expect(descriptor.styles.color).toBe('red');
    expect(descriptor.styles.fontSize).toBe(14);
    expect(descriptor.styles.margin).toBe('10px');
  });

  it('should merge presets, tw and css', () => {
    const node: IJsompNode = {
      id: 'n1',
      type: 'div',
      style_presets: ['btn'],
      style_tw: ['{{paddingSize}}'],
      style_css: {color: '{{primaryColor}}'}
    };

    styleTrait(node, descriptor, context);

    expect(descriptor.props.className).toBe('rounded shadow p-4');
    expect(descriptor.styles.color).toBe('red');
  });

  it('should handle missing style properties gracefully', () => {
    const node: IJsompNode = {
      id: 'n1',
      type: 'div'
    };

    styleTrait(node, descriptor, context);

    expect(descriptor.props.className).toBeUndefined();
    expect(Object.keys(descriptor.styles).length).toBe(0);
  });
});
