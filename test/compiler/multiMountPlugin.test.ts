import {describe, it, expect, beforeEach} from 'vitest';
import {multiMountPlugin} from '../../src/engine/compiler/plugins/MultiMountPlugin';
import {ICompilerContext, IJsompNode, PipelineStage} from '../../src/types';

describe('MultiMountPlugin', () => {
  let ctx: ICompilerContext;

  beforeEach(() => {
    ctx = {
      entities: new Map(),
      nodes: new Map(),
      logger: null as any,
      isUiNode: ((entity: any) => true) as ((entity: any) => entity is IJsompNode),
      options: {}
    };
  });

  it('should be in the ReStructure stage', () => {
    expect(multiMountPlugin.stage).toBe(PipelineStage.ReStructure);
  });

  it('should explode entities with multiple parents', () => {
    // A button that belongs to both 'nav' and 'footer'
    (ctx.entities as Map<string, any>).set('btn', {
      id: 'btn',
      type: 'button',
      parent: ['nav', 'footer']
    });

    multiMountPlugin.handler?.(ctx);

    // Should create synthetic nodes
    expect(ctx.nodes.has('nav.btn')).toBe(true);
    expect(ctx.nodes.has('footer.btn')).toBe(true);

    // Verify synthetic node structure
    const navBtn = ctx.nodes.get('nav.btn') as any;
    expect(navBtn.parent).toBe('nav');
    expect(navBtn._isSynthetic).toBe(true);
    expect(navBtn._originalId).toBe('btn');

    // Original 'btn' should be suppressed
    expect(ctx.nodes.has('btn')).toBe(false);
  });

  it('should explode children of multi-mounted entities', () => {
    // btn -> [nav, footer]
    // icon -> btn
    (ctx.entities as Map<string, any>).set('btn', {
      id: 'btn',
      type: 'button',
      parent: ['nav', 'footer']
    });
    (ctx.entities as Map<string, any>).set('icon', {
      id: 'icon',
      type: 'image',
      parent: 'btn'
    });

    multiMountPlugin.handler?.(ctx);

    // Verify button explosion
    expect(ctx.nodes.has('nav.btn')).toBe(true);
    expect(ctx.nodes.has('footer.btn')).toBe(true);

    // Verify icon explosion (recursive)
    expect(ctx.nodes.has('nav.btn.icon')).toBe(true);
    expect(ctx.nodes.has('footer.btn.icon')).toBe(true);

    const navIcon = ctx.nodes.get('nav.btn.icon') as any;
    expect(navIcon.parent).toBe('nav.btn');
    expect(navIcon._originalId).toBe('icon');

    // Original 'icon' should be suppressed
    expect(ctx.nodes.has('icon')).toBe(false);
  });

  it('should handle deep hierarchies', () => {
    // root
    //   wrapper -> [root1, root2]
    //     inner -> wrapper
    //       leaf -> inner
    (ctx.entities as Map<string, any>).set('wrapper', {id: 'wrapper', parent: ['root1', 'root2']});
    (ctx.entities as Map<string, any>).set('inner', {id: 'inner', parent: 'wrapper'});
    (ctx.entities as Map<string, any>).set('leaf', {id: 'leaf', parent: 'inner'});

    multiMountPlugin.handler?.(ctx);

    expect(ctx.nodes.has('root1.wrapper.inner.leaf')).toBe(true);
    expect(ctx.nodes.has('root2.wrapper.inner.leaf')).toBe(true);

    expect(ctx.nodes.get('root1.wrapper.inner.leaf')?.parent).toBe('root1.wrapper.inner');
  });

  it('should return undefined if no multi-mount occurs', () => {
    (ctx.entities as Map<string, any>).set('btn', {id: 'btn', parent: 'nav'});
    const result = multiMountPlugin.handler?.(ctx);
    expect(result).toBeUndefined();
    expect(ctx.nodes.has('btn')).toBe(false); // Wait, if result is undefined, it didn't change nodes?
    // Actually MultiMountPlugin deletes templates even if no explosion happens? 
    // Let's check the code: it only adds to templatesToSuppress if explode is called.
    // explode is only called if parent is an array.
  });
});
