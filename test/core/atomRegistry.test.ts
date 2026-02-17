import {describe, it, expect, vi, beforeEach} from 'vitest';
import {AtomRegistry, setupJsomp} from '@jsomp/core';

// Mock IJsompAtom for testing
class MockAtom {
  private callbacks = new Set<() => void>();
  constructor(public value: any) { }

  // Conform to IJsompAtom interface loosely for test
  get() {return this.value;}
  set(v: any) {
    if (this.value !== v) {
      this.value = v;
      this.notify();
    }
  }
  subscribe(cb: () => void) {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }
  private notify() {this.callbacks.forEach(cb => cb());}
}

describe('AtomRegistry', () => {
  let registry: AtomRegistry;

  beforeEach(async () => {
    await setupJsomp();
    registry = new AtomRegistry();
  });

  describe('Basic Operations', () => {
    it('should set and get values', () => {
      registry.set('foo', {value: 'bar'});
      expect((registry.get('foo') as any).value).toBe('bar');
    });

    it('should overwrite values', () => {
      registry.set('foo', {value: 'v1'});
      registry.set('foo', {value: 'v2'});
      expect((registry.get('foo') as any).value).toBe('v2');
    });

    it('should delete values when setting undefined', () => {
      registry.set('foo', {value: 'bar'});
      registry.set('foo', undefined);
      expect(registry.get('foo')).toBeUndefined();
    });
  });

  describe('Hierarchical Resolution', () => {
    it('should support parent delegation', () => {
      const parent = new AtomRegistry();
      parent.set('parentKey', {value: 'parentVal'});

      const child = new AtomRegistry(parent);
      expect((child.get('parentKey') as any).value).toBe('parentVal');
    });

    it('should prefer local values over parent', () => {
      const parent = new AtomRegistry();
      parent.set('common', {value: 'parent'});

      const child = new AtomRegistry(parent);
      child.set('common', {value: 'child'});

      expect((child.get('common') as any).value).toBe('child');
      expect((parent.get('common') as any).value).toBe('parent');
    });
  });

  describe('Smart Update', () => {
    it('should update existing atom value instead of replacing instance', () => {
      const atom = new MockAtom('initial');
      registry.set('key', atom as any);

      const spy = vi.fn();
      atom.subscribe(spy);

      // Act: Set with a new object but same key, simulating an update
      registry.set('key', {value: 'updated'} as any);

      // Assert: standard object set doesn't trigger atom.set usually unless implementation does?
      // Wait, implementation checks if prev isAtom and value is NOT atom.
      expect(atom.value).toBe('updated');
      expect(spy).toHaveBeenCalled(); // Should trigger subscription
      expect(registry.get('key')).toBe(atom); // Instance should be preserved
    });

    it('should replace atom if new value is also an atom', () => {
      const atom1 = new MockAtom('v1');
      const atom2 = new MockAtom('v2');

      registry.set('key', atom1 as any);
      registry.set('key', atom2 as any);

      expect(registry.get('key')).toBe(atom2);
    });
  });

  describe('Subscriptions', () => {
    it('should trigger listeners on set', () => {
      const spy = vi.fn();
      registry.subscribe('foo', spy);

      registry.set('foo', {value: 'bar'});
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should bubble events from parent', () => {
      const parent = new AtomRegistry();
      const child = new AtomRegistry(parent);

      const spy = vi.fn();
      child.subscribe('foo', spy);

      parent.set('foo', {value: 'bar'});
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should trigger global listeners', () => {
      const spy = vi.fn();
      registry.subscribeAll(spy);

      registry.set('a', {value: 1});
      expect(spy).toHaveBeenCalledWith('a', {value: 1});
    });
  });

  describe('Batch Operations', () => {
    it('should set multiple values', () => {
      registry.batchSet({
        a: {value: 1},
        b: {value: 2}
      });
      expect((registry.get('a') as any).value).toBe(1);
      expect((registry.get('b') as any).value).toBe(2);
    });
  });
});
