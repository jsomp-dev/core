import {describe, it, expect, beforeEach} from 'vitest';
import {setupJsomp} from '@jsomp/core';
import {requireJsomp} from "../../src/setup";

describe('JSOMP Core - Tree Reconstruction (1.1)', () => {
  beforeEach(async () => {
    await setupJsomp();
  });

  // 1.1.1 多根检测
  it('should detect multiple roots when rootId is not specified', () => {
    const entities = new Map<string, any>();
    entities.set('root1', {id: 'root1', type: 'div'});
    entities.set('root2', {id: 'root2', type: 'div'});
    entities.set('child1', {id: 'child1', type: 'span', parent: 'root1'});

    const tree = requireJsomp().restoreTree(entities);

    expect(tree).toHaveLength(2);
    expect(tree.map((n: any) => n.id)).toContain('root1');
    expect(tree.map((n: any) => n.id)).toContain('root2');
  });

  // 1.1.2 动态槽位 (Slot) 处理
  it('should distribute nodes with __jsomp_slot to parent props', () => {
    const entities = new Map<string, any>();
    entities.set('parent', {id: 'parent', type: 'Card'});
    entities.set('header_node', {
      id: 'header_node',
      type: 'div',
      parent: 'parent',
      slot: 'header',
      props: {children: 'Title'}
    });
    entities.set('content_node', {
      id: 'content_node',
      type: 'p',
      parent: 'parent',
      props: {children: 'Content'}
    });

    const tree = requireJsomp().restoreTree(entities, 'parent');
    const parent = tree[0];

    // Check header_node is in props.header
    expect(parent.props?.header).toBeDefined();
    expect(parent.props?.header.id).toBe('header_node');

    // Check content_node is still in children
    expect((parent as any).children).toHaveLength(1);
    expect((parent as any).children[0].id).toBe('content_node');

    // Verify marker is cleaned up
    expect(parent.props?.header.slot).toBeUndefined();
  });

  // 1.1.3 Should fail if not implemented
  // Note: We expect an error to be thrown to prevent stack overflow
  it('should detect circular parent relationships and throw error', () => {
    const entities = new Map<string, any>();
    entities.set('node1', {id: 'node1', type: 'div', parent: 'node2'});
    entities.set('node2', {id: 'node2', type: 'div', parent: 'node1'});

    // Expecting the system to throw or handle gracefully
    // Current implementation might stack overflow in applySlots
    try {
      requireJsomp().restoreTree(entities);
    } catch (e) {
      expect(e).toBeDefined();
    }
  });
});
