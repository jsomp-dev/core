import {beforeEach, describe, expect, it, vi} from 'vitest';
import {contentTrait, IJsompNode, PipelineContext, slotTrait, styleTrait, TraitPipeline} from '../../src';

describe('TraitPipeline & StandardTraits', () => {
  let pipeline: TraitPipeline;
  let context: PipelineContext;

  beforeEach(() => {
    pipeline = new TraitPipeline();
    pipeline.registerTrait(styleTrait, {priority: 1, name: 'style'});
    pipeline.registerTrait(contentTrait, {priority: 2, name: 'content'});
    pipeline.registerTrait(slotTrait, {priority: 0, name: 'slot'});

    context = {
      registry: {
        get: () => undefined,
        set: () => { },
        batchSet: () => { },
        subscribe: () => () => { },
        subscribeAll: () => () => { },
        version: vi.fn(), // Mock version
      },
      actions: {
        register: () => { },
        getDefinition: () => undefined
      },
      components: {
        register: () => { },
        get: () => undefined,
        getMeta: () => undefined,
        getManifest: () => ({})
      },
      cache: new Map(),
      resolver: {
        resolve: vi.fn((content) => `Resolved: ${content}`)
      },
      stylePresets: {
        'btn-primary': ['bg-blue-500', 'text-white']
      }
    };
  });

  it('should process a standard node correctly', () => {
    const node: IJsompNode = {
      id: 'node1',
      type: 'Button',
      props: {content: 'Click Me'},
      style_presets: ['btn-primary'],
      style_tw: ['p-4'],
      style_css: {fontSize: 16}
    };

    const result = pipeline.processNode(node, context);

    expect(result.id).toBe('node1');
    expect(result.componentType).toBe('Button');
    // Style Trait
    expect(result.props.className).toContain('bg-blue-500'); // Preset
    expect(result.props.className).toContain('p-4');         // Tailwind
    expect(result.styles.fontSize).toBe(16);                 // Inline CSS
    // Content Trait
    expect(result.props.content).toBe('Resolved: Click Me');
  });

  it('should activate DepthGuard when recursion limit exceeded', () => {
    const node: IJsompNode = {id: 'overflow', type: 'Div'};
    const deepContext = {...context, depth: 33};

    const result = pipeline.processNode(node, deepContext);

    expect(result.componentType).toBe('Error');
    expect(result.props.message).toContain('Depth limit exceeded');
  });

  it('should return cached descriptor if node is clean', () => {
    const node: IJsompNode = {id: 'static', type: 'Div'};

    // First pass
    const result1 = pipeline.processNode(node, context);

    // Second pass (Implicitly Clean)
    // We must provide an empty dirtyIds set to simulate a "clean run", 
    // otherwise the pipeline assumes a full refresh (safe default).
    context.dirtyIds = new Set();
    const result2 = pipeline.processNode(node, context);

    expect(result2).toBe(result1); // Same reference

    // Third pass (Dirty)
    context.dirtyIds.add('static');
    const result3 = pipeline.processNode(node, context);

    expect(result3).not.toBe(result1); // New object
  });

  it('should handle slots correctly', () => {
    // Mocking node with children (which is 'any' access in trait)
    const child1 = {id: 'c1', type: 'Span', slot: 'header'};
    const child2 = {id: 'c2', type: 'Span'}; // default slot

    const node: IJsompNode = {
      id: 'container',
      type: 'Div',
    };
    (node as any).children = [child1, child2];

    const result = pipeline.processNode(node, context);

    expect(result.slots['header']).toEqual(['c1']);
    expect(result.slots['default']).toEqual(['c2']);
  });
});
