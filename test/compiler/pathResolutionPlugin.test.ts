import {beforeEach, describe, expect, it} from 'vitest';
import {ICompilerContext, JsompCompiler, PipelineStage, setupJsomp} from '../../src';
import {pathResolutionPlugin} from '../../src/engine';


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


    const {roots} = compiler.compile(entities, {rootId: 'app'});

    expect(roots.length).toBe(1);
    expect(roots[0].id).toBe('app');
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

