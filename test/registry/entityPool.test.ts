import {describe, it, expect, beforeEach, vi} from 'vitest';
import {JsompService} from '../../src/JsompService';
import {jsompEnv} from '../../src/JsompEnv';

describe('EntityRegistry', () => {
  let service: JsompService;

  beforeEach(async () => {
    service = new JsompService();
    await jsompEnv.init({service, framework: 'fallback'});
  });

  it('should register nodes with namespace prefixing', () => {
    service.entities.register('ui', [
      {id: 'btn', type: 'button'},
      {id: 'box', type: 'div', parent: 'btn'}
    ]);

    const btn = service.entities.get('ui.btn');
    const box = service.entities.get('ui.box');

    expect(btn).toBeDefined();
    expect(btn?.id).toBe('ui.btn');
    expect(box).toBeDefined();
    expect(box?.parent).toBe('ui.btn');
  });

  it('should handle conflictMode: error (default)', () => {
    service.entities.register('ui', [{id: 'btn', type: 'button'}]);

    expect(() => {
      service.entities.register('ui', [{id: 'btn', type: 'div'}]);
    }).toThrow();
  });

  it('should handle conflictMode: override', () => {
    service.entities.register('ui', [{id: 'btn', type: 'button'}]);
    service.entities.register('ui', [{id: 'other', type: 'span'}], {conflictMode: 'override'});

    expect(service.entities.get('ui.btn')).toBeUndefined();
    expect(service.entities.get('ui.other')).toBeDefined();
  });

  it('should handle conflictMode: append', () => {
    service.entities.register('ui', [{id: 'btn', type: 'button'}]);
    service.entities.register('ui', [{id: 'other', type: 'span'}], {conflictMode: 'append'});

    expect(service.entities.get('ui.btn')).toBeDefined();
    expect(service.entities.get('ui.other')).toBeDefined();
  });

  it('should support child discovery', () => {
    service.entities.register('ui', [
      {id: 'root', type: 'div'},
      {id: 'child1', parent: 'root', type: 'span'},
      {id: 'child2', parent: 'root', type: 'span'}
    ]);

    const children = service.entities.getChildren('ui.root');
    expect(children.length).toBe(2);
    expect(children.map(c => c.id)).toContain('ui.child1');
    expect(children.map(c => c.id)).toContain('ui.child2');
  });
});
