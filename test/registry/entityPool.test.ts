import {describe, it, expect, beforeEach, vi} from 'vitest';
import {JsompService} from '../../src/JsompService';
import {jsompEnv} from '../../src/JsompEnv';

describe('EntityRegistry', () => {

  beforeEach(async () => {
    await jsompEnv.init({framework: 'fallback'});
  });

  afterEach(() => {
    jsompEnv.clear();
  });

  it('should register nodes with namespace prefixing', () => {
    jsompEnv.service.entities.register('ui', [
      {id: 'btn', type: 'button'},
      {id: 'box', type: 'div', parent: 'btn'}
    ]);

    const btn = jsompEnv.service.entities.get('ui.btn');
    const box = jsompEnv.service.entities.get('ui.box');

    expect(btn).toBeDefined();
    expect(btn?.id).toBe('ui.btn');
    expect(box).toBeDefined();
    expect(box?.parent).toBe('ui.btn');
  });

  it('should handle conflictMode: error (default)', () => {
    jsompEnv.service.entities.register('ui', [{id: 'btn', type: 'button'}]);

    expect(() => {
      jsompEnv.service.entities.register('ui', [{id: 'btn', type: 'div'}]);
    }).toThrow();
  });

  it('should handle conflictMode: override', () => {
    jsompEnv.service.entities.register('ui', [{id: 'btn', type: 'button'}]);
    jsompEnv.service.entities.register('ui', [{id: 'other', type: 'span'}], {conflictMode: 'override'});

    expect(jsompEnv.service.entities.get('ui.btn')).toBeUndefined();
    expect(jsompEnv.service.entities.get('ui.other')).toBeDefined();
  });

  it('should handle conflictMode: append', () => {
    jsompEnv.service.entities.register('ui', [{id: 'btn', type: 'button'}]);
    jsompEnv.service.entities.register('ui', [{id: 'other', type: 'span'}], {conflictMode: 'append'});

    expect(jsompEnv.service.entities.get('ui.btn')).toBeDefined();
    expect(jsompEnv.service.entities.get('ui.other')).toBeDefined();
  });

  it('should support child discovery', () => {
    jsompEnv.service.entities.register('ui', [
      {id: 'root', type: 'div'},
      {id: 'child1', parent: 'root', type: 'span'},
      {id: 'child2', parent: 'root', type: 'span'}
    ]);

    const children = jsompEnv.service.entities.getChildren('ui.root');
    expect(children.length).toBe(2);
    expect(children.map(c => c.id)).toContain('ui.child1');
    expect(children.map(c => c.id)).toContain('ui.child2');
  });
});
