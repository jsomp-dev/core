import {describe, it, expect, beforeEach} from 'vitest';
import {renderHook, act} from '@testing-library/react';
import {useMustache} from '../../src/hook/useMustache';
import {AtomRegistry} from '../../src/impl/core/AtomRegistry';
import {setup} from '../../src/setup';

describe('useMustache Hook (1.2)', () => {
  let registry: AtomRegistry;

  beforeEach(async () => {
    await setup();
    registry = new AtomRegistry();
  });

  it('should return initial values for provided keys', () => {
    registry.set('a', {value: 1});
    registry.set('b', {value: 'hello'});

    const {result} = renderHook(() => useMustache(registry, ['a', 'b']));

    expect(result.current).toEqual([1, 'hello']);
  });

  it('should update when an atom value changes', () => {
    registry.set('a', {value: 1});
    const {result} = renderHook(() => useMustache(registry, ['a']));

    expect(result.current).toEqual([1]);

    act(() => {
      registry.set('a', {value: 2});
    });

    expect(result.current).toEqual([2]);
  });

  it('should handle keys added dynamically (by re-rendering with new keys)', () => {
    registry.set('a', {value: 1});
    registry.set('b', {value: 2});

    const {result, rerender} = renderHook(({keys}) => useMustache(registry, keys), {
      initialProps: {keys: ['a']}
    });

    expect(result.current).toEqual([1]);

    rerender({keys: ['a', 'b']});

    expect(result.current).toEqual([1, 2]);
  });

  it('should maintain reference stability if values do not change', () => {
    registry.set('a', {value: 1});
    const {result, rerender} = renderHook(() => useMustache(registry, ['a']));

    const firstSnapshot = result.current;

    rerender(); // Trigger a re-render of the host component

    expect(result.current).toBe(firstSnapshot); // Reference should keep the same
  });
});
