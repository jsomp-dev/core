import {describe, it, expect} from 'vitest';
import {InjectionRegistry} from '../../src/impl/core/InjectionRegistry';

describe('InjectionRegistry', () => {
  // Use 'any' to bypass strict IJsompNode typing for test data which includes 'children' and string-based 'onEvent'
  const baseNode: any = {
    id: 'node1',
    type: 'div',
    props: {className: 'base'},
    style_presets: ['p1'],
    style_tw: ['text-base'],
    style_css: {color: 'black'},
    onEvent: {click: 'handleClick'},
    actions: {tap: 'onTap'},
    children: []
  };

  it('should return original node if no injection provided', () => {
    const {mergedNode} = InjectionRegistry.resolve(baseNode, 'root.node1');
    expect(mergedNode).toEqual({...baseNode, _fullPath: 'root.node1'});
  });

  it('should merge props', () => {
    const injection = {
      props: {title: 'injected', className: 'merged'}
    };
    const {mergedNode} = InjectionRegistry.resolve(baseNode, 'path', injection as any);

    expect(mergedNode.props).toEqual({
      className: 'merged', // Overwritten
      title: 'injected'
    });
  });

  it('should concat arrays for styles', () => {
    const injection = {
      style_presets: ['p2'],
      style_tw: ['bg-red-500']
    };
    const {mergedNode} = InjectionRegistry.resolve(baseNode, 'path', injection as any);

    expect(mergedNode.style_presets).toEqual(['p1', 'p2']);
    expect(mergedNode.style_tw).toEqual(['text-base', 'bg-red-500']);
  });

  it('should merge objects for css and events', () => {
    const injection = {
      style_css: {fontSize: '20px', color: 'red'},
      onEvent: {hover: 'handleHover'},
      actions: {swipe: 'onSwipe'}
    };
    const {mergedNode} = InjectionRegistry.resolve(baseNode, 'path', injection as any);

    expect(mergedNode.style_css).toEqual({
      color: 'red', // Overwritten
      fontSize: '20px'
    });
    expect(mergedNode.onEvent).toEqual({
      click: 'handleClick',
      hover: 'handleHover'
    });
    expect(mergedNode.actions).toEqual({
      tap: 'onTap',
      swipe: 'onSwipe'
    });
  });

  it('should handle missing base properties gracefully', () => {
    const emptyNode: any = {id: 'empty', type: 'span', children: []};
    const injection = {
      props: {a: 1},
      style_presets: ['p1'],
      style_tw: ['tw1'],
      style_css: {k: 'v'},
      onEvent: {e: 'h'},
      actions: {a: 'h'}
    };

    const {mergedNode} = InjectionRegistry.resolve(emptyNode, 'path', injection as any);

    expect(mergedNode.props).toEqual({a: 1});
    expect(mergedNode.style_presets).toEqual(['p1']);
    expect(mergedNode.style_tw).toEqual(['tw1']);
    expect(mergedNode.style_css).toEqual({k: 'v'});
    expect(mergedNode.onEvent).toEqual({e: 'h'});
    expect(mergedNode.actions).toEqual({a: 'h'});
  });
});
