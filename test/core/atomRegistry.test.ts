import {describe, it, expect, vi, beforeEach} from 'vitest';
import {AtomRegistry, setupJsomp} from "../../src";

// Mock IJsompAtom for testing
class MockAtom {
  private callbacks = new Set<(value: any, set: (v: any) => void) => void>();
  constructor(public value: any) { }

  // Conform to IJsompAtom interface loosely for test
  get() {return this.value;}
  set(v: any) {
    if (this.value !== v) {
      this.value = v;
      this.notify();
    }
  }
  subscribe(cb: (value: any, set: (v: any) => void) => void) {
    this.callbacks.add(cb);
    return () => this.callbacks.delete(cb);
  }
  private notify() {this.callbacks.forEach(cb => cb(this.value, this.set.bind(this)));}
}

describe('AtomRegistry', () => {
  let registry: AtomRegistry;

  beforeEach(async () => {
    await setupJsomp({framework: 'fallback'});
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

  describe('Smart Update', () => {
    it('should update existing atom value instead of replacing instance', () => {
      const atom = new MockAtom('initial');
      registry.set('key', atom as any);

      const spy = vi.fn();
      atom.subscribe(spy);

      // Act: Set with a new object but same key, simulating an update
      registry.set('key', {value: 'updated'} as any);

      // Assert
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
    it('should trigger listeners on local set', () => {
      const spy = vi.fn();
      registry.subscribe('foo', spy);

      registry.set('foo', {value: 'bar'});
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should trigger global listeners', () => {
      const spy = vi.fn();
      registry.subscribeAll(spy);

      registry.set('a', {value: 1});
      expect(spy).toHaveBeenCalledWith('a', {value: 1}, expect.any(Function), expect.any(Function));
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

  describe('Nested Path Updates on Atoms', () => {
    it('should update atom value when setting nested path (root is atom)', () => {
      const atom = new MockAtom({name: 'test', count: 0}) as any;
      registry.set('node1', atom);

      registry.set('node1.states', {count: 5} as any);

      expect(atom.value).toEqual({name: 'test', count: 0, states: {count: 5}});
      expect(registry.get('node1')).toBe(atom);
      expect(registry.get('node1.states')).toEqual({count: 5});
    });

    it('should patch atom value when patching nested path (root is atom)', () => {
      const atom = new MockAtom({name: 'test', count: 0, extra: 'original'}) as any;
      registry.set('node1', atom);

      registry.patch('node1.states', {count: 10});

      expect(atom.value.states).toEqual({count: 10});
    });

    it('should include nested atom states in snapshot', () => {
      const atom = new MockAtom({name: 'test'}) as any;
      registry.set('node1', atom);

      registry.patch('node1.states', {count: 0});

      const snapshot = registry.getSnapshot();
      expect(snapshot).toHaveProperty('node1');
      expect(snapshot.node1).toEqual({name: 'test', states: {count: 0}});
    });

    it('should trigger subscriptions when updating nested path on atom', () => {
      const atom = new MockAtom({name: 'test', count: 0}) as any;
      registry.set('node1', atom);

      const spy = vi.fn();
      registry.subscribe('node1', spy);
      registry.subscribe('node1.states', spy as any);

      registry.patch('node1.states', {count: 99});

      expect(spy).toHaveBeenCalled();
      expect(atom.value.states).toEqual({count: 99});
    });

    it('should handle deep nested path on atom', () => {
      const atom = new MockAtom({a: {b: {c: 1}}}) as any;
      registry.set('root', atom);

      registry.set('root.a.b.c', 999 as any);

      expect(atom.value).toEqual({a: {b: {c: 999}}});
    });

    it('should not create orphan key for nested path on atom', () => {
      const atom = new MockAtom({name: 'test'}) as any;
      registry.set('node1', atom);

      registry.patch('node1.states', {count: 0});

      const snapshot = registry.getSnapshot();
      expect(snapshot['node1.states']).toBeUndefined();
      expect(snapshot.node1).toEqual({name: 'test', states: {count: 0}});
    });
  });
});
