import {describe, it, expect, beforeEach} from 'vitest';
import {setup, jsomp} from '@jsomp/core';

describe('JSOMP Core - restoreTree', () => {
  beforeEach(async () => {
    // Ensure standard plugins are registered
    await setup();
  });

  it('should restore a simple tree from a flat map', () => {
    const entities = new Map<string, any>();
    entities.set('root', {id: 'root', type: 'div'});
    entities.set('child', {id: 'child', type: 'span', parent: 'root'});

    const tree = jsomp.restoreTree(entities, 'root');

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('root');
    expect((tree[0] as any).children).toHaveLength(1);
    expect((tree[0] as any).children[0].id).toBe('child');
  });

  it('should handle nested structures correctly', () => {
    const entities = new Map<string, any>();
    entities.set('a', {id: 'a', type: 'div'});
    entities.set('b', {id: 'b', type: 'div', parent: 'a'});
    entities.set('c', {id: 'c', type: 'span', parent: 'b'});

    const tree = jsomp.restoreTree(entities, 'a');

    const nodeA = tree[0];
    const nodeB = (nodeA as any).children[0];
    const nodeC = (nodeB as any).children[0];

    expect(nodeA.id).toBe('a');
    expect(nodeB.id).toBe('b');
    expect(nodeC.id).toBe('c');
  });

  it('should handle unlinked nodes (orphan prevention) when rootId is NOT specified', () => {
    const entities = new Map<string, any>();
    entities.set('root', {id: 'root', type: 'div'});
    entities.set('orphan', {id: 'orphan', type: 'div'}); // No parent

    // If rootId is NOT specified, all nodes without valid parents should be returned as roots
    const tree = jsomp.restoreTree(entities);

    expect(tree.some((n: any) => n.id === 'root')).toBe(true);
    expect(tree.some((n: any) => n.id === 'orphan')).toBe(true);
    expect(tree).toHaveLength(2);
  });

  it('should filter only the requested root when rootId IS specified', () => {
    const entities = new Map<string, any>();
    entities.set('root', {id: 'root', type: 'div'});
    entities.set('orphan', {id: 'orphan', type: 'div'});

    const tree = jsomp.restoreTree(entities, 'root');

    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('root');
    expect(tree.some((n: any) => n.id === 'orphan')).toBe(false);
  });
});
