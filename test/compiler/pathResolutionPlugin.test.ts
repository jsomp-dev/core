import {beforeEach, describe, expect, it} from 'vitest';
import {ICompilerContext, JsompCompiler, PipelineStage, setupJsomp} from '../../src';
import {pathResolutionPlugin} from '../../src/engine/compiler/plugins';
import {InjectionRegistry} from '../../src/impl/core/InjectionRegistry';

describe('PathResolutionPlugin', () => {
  let compiler: JsompCompiler;

  beforeEach(async () => {
    await setupJsomp();
    compiler = new JsompCompiler();
    // Register PathResolutionPlugin manually for testing
    compiler.use('path-resolution', PipelineStage.PreProcess, pathResolutionPlugin as any);
  });

  it('should handle standard parent reference', () => {
    const entities = new Map([
      ['app', {id: 'app', type: 'div'}],
      ['child', {id: 'child', type: 'span', parent: 'app'}]
    ]);

    const result = compiler.compile(entities, {rootId: 'app'});

    expect(result.length).toBe(1);
    expect(result[0].id).toBe('app');
  });

  it('should calculate _fullPath correctly for normal hierarchy', () => {
    const entities = new Map([
      ['app', {id: 'app', type: 'div'}],
      ['child', {id: 'child', type: 'span', parent: 'app'}]
    ]);

    let nodes: any[] = [];
    compiler.use('capture', PipelineStage.Hydrate, {
      id: 'capture',
      handler: (ctx: ICompilerContext) => {
        nodes = Array.from(ctx.nodes.values());
      }
    });
    compiler.compile(entities);

    const childNode = nodes.find(n => n.id === 'child');
    expect(childNode._fullPath).toBe('app.child');
  });

  it('should handle modern slot attribute', () => {
    const entities = new Map([
      ['card', {id: 'card', type: 'Card'}],
      ['icon', {id: 'icon', type: 'Icon', parent: 'card', slot: 'header'}]
    ]);

    let nodes: any[] = [];
    compiler.use('capture', PipelineStage.Hydrate, {
      id: 'capture',
      handler: (ctx: ICompilerContext) => {
        nodes = Array.from(ctx.nodes.values());
      }
    });
    compiler.compile(entities);

    const iconNode = nodes.find(n => n.id === 'icon');
    expect(iconNode.id).toBe('icon');
    expect(iconNode.parent).toBe('card');
    expect(iconNode.slot).toBe('header');
    expect(iconNode._fullPath).toBe('card.icon');
  });

  it('should handle nested paths in parent with slot attribute', () => {
    const entities = new Map([
      ['root', {id: 'root', type: 'div'}],
      ['card', {id: 'card', type: 'Card', parent: 'root'}],
      ['icon', {id: 'icon', type: 'Icon', parent: 'root.card', slot: 'header'}]
    ]);

    let nodes: any[] = [];
    compiler.use('capture', PipelineStage.Hydrate, {
      id: 'capture',
      handler: (ctx: ICompilerContext) => {
        nodes = Array.from(ctx.nodes.values());
      }
    });
    compiler.compile(entities);

    const iconNode = nodes.find(n => n.id === 'icon');
    expect(iconNode.id).toBe('icon');
    expect(iconNode.parent).toBe('card');
    expect(iconNode.slot).toBe('header');
    expect(iconNode._fullPath).toBe('root.card.icon');
  });
});

describe('InjectionRegistry', () => {
  it('should merge slot attribute from injection', () => {
    const node: any = {id: 'test', type: 'div'};
    const injection: any = {slot: 'header', props: {title: 'Hello'}};

    const {mergedNode} = InjectionRegistry.resolve(node, 'full.path', injection);

    expect(mergedNode.slot).toBe('header');
    expect(mergedNode.props?.title).toBe('Hello');
  });

  it('should retain existing slot if not in injection', () => {
    const node: any = {id: 'test', type: 'div', slot: 'footer'};
    const injection: any = {props: {title: 'Hello'}};

    const {mergedNode} = InjectionRegistry.resolve(node, 'full.path', injection);

    expect(mergedNode.slot).toBe('footer');
  });
});
