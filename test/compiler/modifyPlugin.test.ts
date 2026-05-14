import {describe, it, expect, vi} from 'vitest';
import {modifyPlugin} from '../../src/engine/compiler/plugins/ModifyPlugin';
import {ICompilerContext, PipelineStage} from '../../src/types';

function createMockContext(entities: Record<string, any>, atoms?: Record<string, any>): ICompilerContext {
  const entityMap = new Map(Object.entries(entities));

  const atomRegistry = atoms ? {
    get: (key: string) => atoms[key],
    set: () => {},
    has: (key: string) => key in (atoms || {}),
    subscribe: () => () => {},
    subscribeAll: () => () => {},
    getSnapshot: () => ({...atoms}),
  } as any : undefined;

  return {
    entities: entityMap,
    nodes: new Map(),
    atomRegistry,
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

describe('ModifyPlugin', () => {
  it('should be in the PreProcess stage', () => {
    expect(modifyPlugin.stage).toBe(PipelineStage.PreProcess);
  });

  it('should return undefined when no modify fields exist', () => {
    const ctx = createMockContext({
      node: {id: 'node', type: 'div'}
    });

    const result = modifyPlugin.handler!(ctx);
    expect(result).toBeUndefined();
  });

  describe('feed mode', () => {
    it('should shallow-merge props into target', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'div', props: {title: 'Hello', count: 1}},
        modifier: {id: 'modifier', type: 'div', props: {count: 2, active: true}, modify: {target: 'target', mode: 'feed'}}
      });

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');

      expect(updated.props).toEqual({title: 'Hello', count: 2, active: true});
    });

    it('should union-merge style arrays', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'div', style_tw: ['p-4', 'bg-red-500']},
        modifier: {id: 'modifier', type: 'div', style_tw: ['p-4', 'text-white'], modify: {target: 'target', mode: 'feed'}}
      });

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');

      expect(updated.style_tw).toEqual(expect.arrayContaining(['p-4', 'bg-red-500', 'text-white']));
      expect(updated.style_tw.length).toBe(3);
    });

    it('should shallow-merge style_css objects', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'div', style_css: {color: 'red', fontSize: '14px'}},
        modifier: {id: 'modifier', type: 'div', style_css: {color: 'blue', background: '#fff'}, modify: {target: 'target', mode: 'feed'}}
      });

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');

      expect(updated.style_css).toEqual({color: 'blue', fontSize: '14px', background: '#fff'});
    });

    it('should merge actions with event union', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'button', actions: {'click': ['dom:click']}},
        modifier: {id: 'modifier', type: 'button', actions: {'click': ['key:enter'], 'hover': ['dom:mouseenter']}, modify: {target: 'target', mode: 'feed'}}
      });

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');

      expect(updated.actions.click).toEqual(expect.arrayContaining(['dom:click', 'key:enter']));
      expect(updated.actions.hover).toEqual(['dom:mouseenter']);
    });
  });

  describe('override mode', () => {
    it('should overwrite same-level fields on target', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'div', props: {title: 'Hello', count: 1}, style_tw: ['p-4']},
        modifier: {id: 'modifier', type: 'span', props: {count: 2}, style_css: {color: 'red'}, modify: {target: 'target', mode: 'override'}}
      });

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');

      expect(updated.type).toBe('div');
      expect(updated.props).toEqual({count: 2});
      expect(updated.style_tw).toEqual(['p-4']);
      expect(updated.style_css).toEqual({color: 'red'});
    });

    it('should not merge objects, only replace', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'div', props: {title: 'Hello', nested: {a: 1, b: 2}}},
        modifier: {id: 'modifier', type: 'div', props: {nested: {c: 3}}, modify: {target: 'target', mode: 'override'}}
      });

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');

      expect(updated.props.nested).toEqual({c: 3});
    });
  });

  describe('replace mode', () => {
    it('should completely replace target data while preserving id', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'div', props: {title: 'Old'}, style_tw: ['p-4']},
        modifier: {id: 'modifier', type: 'span', props: {content: 'New'}, style_css: {color: 'red'}, modify: {target: 'target', mode: 'replace', allowDangerousFields: ['type']}}
      });

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');

      expect(updated.id).toBe('target');
      expect(updated.type).toBe('span');
      expect(updated.props).toEqual({content: 'New'});
      expect(updated.style_tw).toBeUndefined();
      expect(updated.style_css).toEqual({color: 'red'});
    });
  });

  describe('dangerous fields protection', () => {
    it('should block modification of dangerous fields by default', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'div', parent: 'root'},
        modifier: {id: 'modifier', type: 'span', parent: 'other', modify: {target: 'target', mode: 'override'}}
      });

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');

      expect(updated.type).toBe('div');
      expect(updated.parent).toBe('root');
    });

    it('should allow dangerous fields when explicitly listed', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'div', parent: 'root'},
        modifier: {id: 'modifier', type: 'span', parent: 'other', modify: {target: 'target', mode: 'override', allowDangerousFields: ['type', 'parent']}}
      });

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');

      expect(updated.type).toBe('span');
      expect(updated.parent).toBe('other');
    });

    it('should block id modification even with allowDangerousFields', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'div'},
        modifier: {id: 'modifier', type: 'div', modify: {target: 'target', mode: 'replace', allowDangerousFields: ['id']}}
      });

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');

      expect(updated.id).toBe('target');
    });
  });

  describe('target path resolution', () => {
    it('should resolve absolute target path', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'div', props: {x: 1}},
        modifier: {id: 'modifier', type: 'div', props: {x: 2}, modify: {target: 'target', mode: 'override'}}
      });

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');
      expect(updated.props.x).toBe(2);
    });

    it('should resolve backtracking target path via scope chain', () => {
      const ctx = createMockContext({
        parent: {id: 'parent', type: 'container'},
        sibling: {id: 'sibling', type: 'div', parent: 'parent', props: {color: 'red'}},
        modifier: {id: 'modifier', type: 'div', parent: 'parent', props: {color: 'blue'}, modify: {target: 'sibling', mode: 'override'}}
      });

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('sibling');
      expect(updated.props.color).toBe('blue');
    });

    it('should resolve target across parent scope', () => {
      const ctx = createMockContext({
        grandparent: {id: 'gp', type: 'container'},
        parent: {id: 'parent', type: 'container', parent: 'gp'},
        target: {id: 'target', type: 'div', parent: 'gp', props: {x: 1}},
        modifier: {id: 'modifier', type: 'div', parent: 'parent', props: {x: 2}, modify: {target: 'target', mode: 'override'}}
      });

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');
      expect(updated.props.x).toBe(2);
    });
  });

  describe('modify node suppression', () => {
    it('should suppress the modify node itself', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'div', props: {x: 1}},
        modifier: {id: 'modifier', type: 'div', props: {x: 2}, modify: {target: 'target', mode: 'override'}}
      });

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      expect(result.get('modifier')).toBeNull();
    });
  });

  describe('integration with pull', () => {
    it('should modify a node that was pulled from entity pool', () => {
      const ctx = createMockContext({
        section: {id: 'section', type: 'div', pull: 'comp-profile'},
        modifier: {id: 'modifier', type: 'div', props: {extra: 'data'}, modify: {target: 'section__comp-profile__container', mode: 'feed'}}
      });

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      expect(result.has('section__comp-profile__container')).toBe(false);
    });
  });

  describe('mustache binding support', () => {
    it('should resolve target from atom binding', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'div', props: {x: 1}},
        modifier: {id: 'modifier', type: 'div', props: {x: 2}, modify: {target: '{{targetId}}', mode: 'override'}}
      }, {targetId: 'target'});

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');
      expect(updated.props.x).toBe(2);
    });

    it('should resolve mode from atom binding', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'div', props: {title: 'Hello', count: 1}},
        modifier: {id: 'modifier', type: 'div', props: {count: 2}, modify: {target: 'target', mode: '{{editMode}}'}}
      }, {editMode: 'override'});

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');
      expect(updated.props).toEqual({count: 2});
    });

    it('should resolve both target and mode from atom bindings', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'div', props: {title: 'Hello', count: 1}},
        modifier: {id: 'modifier', type: 'div', props: {count: 2}, modify: {target: '{{tgt}}', mode: '{{md}}'}}
      }, {tgt: 'target', md: 'override'});

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');
      expect(updated.props).toEqual({count: 2});
    });

    it('should track dependencies via onDependency', () => {
      const onDependency = vi.fn();
      const ctx = createMockContext({
        target: {id: 'target', type: 'div', props: {x: 1}},
        modifier: {id: 'modifier', type: 'div', props: {x: 2}, modify: {target: '{{targetId}}', mode: '{{editMode}}'}}
      }, {targetId: 'target', editMode: 'override'});
      ctx.onDependency = onDependency;

      modifyPlugin.handler!(ctx);

      expect(onDependency).toHaveBeenCalledWith('modifier', 'targetId');
      expect(onDependency).toHaveBeenCalledWith('modifier', 'editMode');
    });

    it('should fallback to raw value when atom is missing', () => {
      const ctx = createMockContext({
        target: {id: 'target', type: 'div', props: {x: 1}},
        modifier: {id: 'modifier', type: 'div', props: {x: 2}, modify: {target: 'target', mode: 'override'}}
      }, {});

      const result = modifyPlugin.handler!(ctx) as Map<string, any>;
      const updated = result.get('target');
      expect(updated.props.x).toBe(2);
    });
  });
});