import {describe, it, expect, beforeEach} from 'vitest';
import {pullPlugin} from '../../src/engine/compiler/plugins/PullPlugin';
import {EntityRegistry} from '../../src/registry/EntityRegistry';
import {ICompilerContext, IJsompNode, PipelineStage} from '../../src/types';

function createMockContext(entities: Record<string, any>, poolNodes?: Record<string, any[]>): ICompilerContext {
  const entityMap = new Map(Object.entries(entities));
  const entityPool = new EntityRegistry();

  if (poolNodes) {
    for (const [ns, nodes] of Object.entries(poolNodes)) {
      entityPool.register(ns, nodes as any, {conflictMode: 'override'});
    }
  }

  return {
    entities: entityMap,
    nodes: new Map(),
    entityPool,
    logger: {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      throw: (code: any, msg: string) => { throw new Error(msg); }
    } as any,
    isUiNode: ((entity: any) => true) as any,
    options: {},
    hasStructureChanged: false,
  };
}

describe('PullPlugin', () => {
  it('should be in the PreProcess stage', () => {
    expect(pullPlugin.stage).toBe(PipelineStage.PreProcess);
  });

  it('should pull a single root node from pool by namespace', () => {
    const ctx = createMockContext(
      {section: {id: 'section', type: 'div', pull: 'comp-profile'}},
      {
        'comp-profile': [
          {id: 'container', type: 'div', style_css: {padding: '1rem'}},
        ]
      }
    );

    const result = pullPlugin.handler!(ctx);

    expect(result).toBeInstanceOf(Map);
    expect(result!.has('section.comp-profile.container')).toBe(true);
    expect(result!.get('section')).toBeNull();

    const pulled = result!.get('section.comp-profile.container');
    expect(pulled.parent).toBeNull();
    expect(pulled._isSynthetic).toBe(true);
    expect(pulled._originalId).toBe('comp-profile.container');
    expect(pulled.style_css).toEqual({padding: '1rem'});
  });

  it('should pull a subtree with parent-child relationships', () => {
    const ctx = createMockContext(
      {section: {id: 'section', type: 'div', pull: 'comp-profile'}},
      {
        'comp-profile': [
          {id: 'container', type: 'div'},
          {id: 'avatar', parent: 'container', type: 'div'},
          {id: 'name', parent: 'container', type: 'div'},
        ]
      }
    );

    const result = pullPlugin.handler!(ctx);

    expect(result!.has('section.comp-profile.container')).toBe(true);
    expect(result!.has('section.comp-profile.avatar')).toBe(true);
    expect(result!.has('section.comp-profile.name')).toBe(true);

    expect(result!.get('section.comp-profile.avatar').parent).toBe('section.comp-profile.container');
    expect(result!.get('section.comp-profile.name').parent).toBe('section.comp-profile.container');
    expect(result!.get('section.comp-profile.container').parent).toBeNull();
  });

  it('should pull a specific node by full ID', () => {
    const ctx = createMockContext(
      {card: {id: 'card', type: 'div', pull: 'comp-profile.container'}},
      {
        'comp-profile': [
          {id: 'container', type: 'div'},
          {id: 'avatar', parent: 'container', type: 'div'},
        ]
      }
    );

    const result = pullPlugin.handler!(ctx);

    expect(result!.has('card.comp-profile.container')).toBe(true);
    expect(result!.has('card.comp-profile.avatar')).toBe(true);
    expect(result!.get('card')).toBeNull();
  });

  it('should place pulled roots under the pull node parent', () => {
    const ctx = createMockContext(
      {section: {id: 'section', type: 'div', parent: 'page', pull: 'comp-profile'}},
      {
        'comp-profile': [
          {id: 'container', type: 'div'},
        ]
      }
    );

    const result = pullPlugin.handler!(ctx);

    expect(result!.get('section.comp-profile.container').parent).toBe('page');
  });

  it('should handle multi-parent pull node (Plan A)', () => {
    const ctx = createMockContext(
      {section: {id: 'section', type: 'div', parent: ['left', 'right'], pull: 'comp-profile'}},
      {
        'comp-profile': [
          {id: 'container', type: 'div'},
        ]
      }
    );

    const result = pullPlugin.handler!(ctx);

    expect(result!.has('left.section.comp-profile.container')).toBe(true);
    expect(result!.has('right.section.comp-profile.container')).toBe(true);

    expect(result!.get('left.section.comp-profile.container').parent).toBe('left');
    expect(result!.get('right.section.comp-profile.container').parent).toBe('right');
    expect(result!.get('section')).toBeNull();
  });

  it('should handle multi-parent with subtree', () => {
    const ctx = createMockContext(
      {section: {id: 'section', type: 'div', parent: ['a', 'b'], pull: 'comp-profile'}},
      {
        'comp-profile': [
          {id: 'root', type: 'div'},
          {id: 'child', parent: 'root', type: 'span'},
        ]
      }
    );

    const result = pullPlugin.handler!(ctx);

    expect(result!.has('a.section.comp-profile.root')).toBe(true);
    expect(result!.has('a.section.comp-profile.child')).toBe(true);
    expect(result!.has('b.section.comp-profile.root')).toBe(true);
    expect(result!.has('b.section.comp-profile.child')).toBe(true);

    expect(result!.get('a.section.comp-profile.child').parent).toBe('a.section.comp-profile.root');
    expect(result!.get('b.section.comp-profile.child').parent).toBe('b.section.comp-profile.root');
  });

  it('should pull multiple root nodes from namespace', () => {
    const ctx = createMockContext(
      {section: {id: 'section', type: 'div', pull: 'multi-root'}},
      {
        'multi-root': [
          {id: 'header', type: 'div'},
          {id: 'footer', type: 'div'},
        ]
      }
    );

    const result = pullPlugin.handler!(ctx);

    expect(result!.has('section.multi-root.header')).toBe(true);
    expect(result!.has('section.multi-root.footer')).toBe(true);
    expect(result!.get('section.multi-root.header').parent).toBeNull();
    expect(result!.get('section.multi-root.footer').parent).toBeNull();
  });

  it('should suppress the pull node itself', () => {
    const ctx = createMockContext(
      {section: {id: 'section', type: 'div', pull: 'comp-profile'}},
      {
        'comp-profile': [
          {id: 'container', type: 'div'},
        ]
      }
    );

    const result = pullPlugin.handler!(ctx);
    expect(result!.get('section')).toBeNull();
  });

  it('should return undefined when no pull fields exist', () => {
    const ctx = createMockContext(
      {node: {id: 'node', type: 'div'}}
    );

    const result = pullPlugin.handler!(ctx);
    expect(result).toBeUndefined();
  });

  it('should warn when entity pool is not available', () => {
    const ctx: ICompilerContext = {
      entities: new Map([['node', {id: 'node', pull: 'comp-profile'}]]),
      nodes: new Map(),
      logger: {
        warn: () => {},
        info: () => {},
        error: () => {},
        debug: () => {},
        throw: (code: any, msg: string) => { throw new Error(msg); }
      } as any,
      isUiNode: ((entity: any) => true) as any,
      options: {},
    };

    const result = pullPlugin.handler!(ctx);
    expect(result).toBeUndefined();
  });

  it('should throw on non-existent pool reference', () => {
    const ctx = createMockContext(
      {node: {id: 'node', pull: 'comp-profile.missing'}},
      {
        'comp-profile': [
          {id: 'container', type: 'div'},
        ]
      }
    );

    expect(() => pullPlugin.handler!(ctx)).toThrow('non-existent');
  });

  it('should handle deep nested subtree', () => {
    const ctx = createMockContext(
      {root: {id: 'root', type: 'div', pull: 'deep-tree'}},
      {
        'deep-tree': [
          {id: 'level1', type: 'div'},
          {id: 'level2', parent: 'level1', type: 'div'},
          {id: 'level3', parent: 'level2', type: 'div'},
          {id: 'leaf', parent: 'level3', type: 'span'},
        ]
      }
    );

    const result = pullPlugin.handler!(ctx);

    expect(result!.has('root.deep-tree.level1')).toBe(true);
    expect(result!.has('root.deep-tree.level2')).toBe(true);
    expect(result!.has('root.deep-tree.level3')).toBe(true);
    expect(result!.has('root.deep-tree.leaf')).toBe(true);

    expect(result!.get('root.deep-tree.level2').parent).toBe('root.deep-tree.level1');
    expect(result!.get('root.deep-tree.level3').parent).toBe('root.deep-tree.level2');
    expect(result!.get('root.deep-tree.leaf').parent).toBe('root.deep-tree.level3');
  });

  it('should detect circular references', () => {
    const ctx = createMockContext(
      {node: {id: 'node', pull: 'circular'}},
      {
        'circular': [
          {id: 'a', type: 'div'},
          {id: 'b', parent: 'a', type: 'div'},
        ]
      }
    );

    const pool = ctx.entityPool!;
    const bNode = pool.get('circular.b')!;
    (bNode as any).parent = 'circular.a';

    const result = pullPlugin.handler!(ctx);
    expect(result!.has('node.circular.a')).toBe(true);
    expect(result!.has('node.circular.b')).toBe(true);
  });

  it('should set hasStructureChanged when pull occurs', () => {
    const ctx = createMockContext(
      {section: {id: 'section', type: 'div', pull: 'comp-profile'}},
      {
        'comp-profile': [
          {id: 'container', type: 'div'},
        ]
      }
    );

    pullPlugin.handler!(ctx);
    expect(ctx.hasStructureChanged).toBe(true);
  });

  it('should not set hasStructureChanged when no pull', () => {
    const ctx = createMockContext(
      {node: {id: 'node', type: 'div'}}
    );

    pullPlugin.handler!(ctx);
    expect(ctx.hasStructureChanged).toBeFalsy();
  });
});