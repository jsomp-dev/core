import {describe, it, expect, beforeEach} from 'vitest';
import {setupJsomp} from '@jsomp/core';
import {DefaultFlattener} from '../../src/uniform/DefaultFlattener';

// Define a basic Node interface for clarity and type safety
interface TestNode {
  id: string;
  type: string;
  props?: Record<string, any>;
  children: TestNode[];
}

// Define the type for a flattened entity, which includes a parent ID
interface FlattenedEntity extends TestNode {
  parent?: string;
}

describe('DefaultFlattener - Atomic Recovery (1.1.4)', () => {
  let flattener: DefaultFlattener;

  beforeEach(async () => {
    await setupJsomp();
    flattener = new DefaultFlattener();
  });

  it('should maintain atomic recovery parity (flatten -> unflatten -> flatten)', () => {
    const originalTree = [
      {
        id: 'root',
        type: 'div',
        children: [
          {
            id: 'child1',
            type: 'span',
            props: {text: 'hello'},
            children: []
          },
          {
            id: 'child2',
            type: 'div',
            children: [
              {id: 'grandchild', type: 'p', children: []}
            ]
          }
        ]
      }
    ];

    // 1. Flatten
    const entities = flattener.flatten(originalTree);
    expect(entities.size).toBe(4);
    expect(entities.get('child1')?.parent).toBe('root');

    // 2. Unflatten
    const restoredTree = flattener.unflatten(entities);

    // 3. Flatten again
    const reFlattened = flattener.flatten(restoredTree);

    // Verify Parity
    expect(reFlattened.size).toBe(entities.size);

    entities.forEach((val, key) => {
      const reVal = reFlattened.get(key);
      expect(reVal).toBeDefined();
      expect(reVal?.type).toBe(val.type);
      expect(reVal?.parent).toBe(val.parent);
    });
  });

  it('should handle array based input in flatten', () => {
    const input = [
      {id: '1', type: 'a'},
      {id: '2', type: 'b'}
    ];
    const map = flattener.flatten(input);
    expect(map.size).toBe(2);
    expect(map.get('1')).toBeDefined();
    expect(map.get('2')).toBeDefined();
  });

  describe('Stress Test (Phase B Requirement)', () => {
    it('should handle 5000+ nodes within reasonable time', () => {
      const totalNodes = 5000;
      const root: TestNode = {id: 'root', type: 'root', children: []};

      // Generate flat list first to simulate depth or breadth
      // Making a deep tree or wide tree? Let's do mixed.
      // Every node has 2 children up to some depth? 2^12 = 4096. 
      // Or just a flat list under root for simplicity of generation, 
      // but deep recursion is better stress test for processNode.

      // Generating a deep linear chain for stack depth test
      let current = root;
      for (let i = 0; i < 1000; i++) {
        const next: TestNode = {id: `node-${i}`, type: 'div', children: []};
        current.children.push(next);
        current = next;
      }

      // Generating wide children
      for (let i = 1000; i < totalNodes; i++) {
        root.children.push({id: `leaf-${i}`, type: 'span', children: []});
      }

      const startFlatten = performance.now();
      const flatMap = flattener.flatten(root);
      const endFlatten = performance.now();

      expect(flatMap.size).toBe(totalNodes + 1); // +1 for root
      expect(endFlatten - startFlatten).toBeLessThan(200); // Expect < 200ms

      const startUnflatten = performance.now();
      const tree = flattener.unflatten(flatMap, 'root');
      const endUnflatten = performance.now();

      expect(tree.length).toBe(1);
      expect(tree[0].id).toBe('root');
      expect(endUnflatten - startUnflatten).toBeLessThan(200);
    });
  });
});
