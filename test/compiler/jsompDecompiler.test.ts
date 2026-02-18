import {beforeEach, describe, expect, it} from 'vitest';
import {JsompDecompiler, setupJsomp} from '../../src';

describe('JsompDecompiler', () => {
  beforeEach(async () => {
    await setupJsomp();
  });

  it('should decompile slot nodes with standard parent and slot attribute', () => {
    const tree: any = {
      id: 'card',
      type: 'Card',
      props: {
        header: {
          id: 'title',
          type: 'Text',
          props: {content: 'Hello'}
        }
      }
    };

    const flatMap = JsompDecompiler.flatten(tree);

    expect(flatMap.has('card')).toBe(true);
    expect(flatMap.has('title')).toBe(true);

    const titleNode = flatMap.get('title');
    expect(titleNode.parent).toBe('card');
    expect(titleNode.slot).toBe('header');

    // Verify legacy [slot] is NOT used
    expect(titleNode.parent).not.toContain('[slot]');
  });

  it('should handle array slots', () => {
    const tree: any = {
      id: 'list',
      type: 'List',
      props: {
        items: [
          {id: 'item1', type: 'Item', props: {}},
          {id: 'item2', type: 'Item', props: {}}
        ]
      }
    };

    const flatMap = JsompDecompiler.flatten(tree);

    expect(flatMap.has('item1')).toBe(true);
    expect(flatMap.has('item2')).toBe(true);

    expect(flatMap.get('item1').parent).toBe('list');
    expect(flatMap.get('item1').slot).toBe('items');
    expect(flatMap.get('item2').parent).toBe('list');
    expect(flatMap.get('item2').slot).toBe('items');
  });
});
