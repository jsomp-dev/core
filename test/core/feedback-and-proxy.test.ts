import {describe, it, expect, vi, beforeEach} from 'vitest';
import {AtomRegistry, JsompAtom, setupJsomp} from '../../src';
import {createActionAtomsProxy, createPathAwareProxy} from '../../src/utils/proxy';

describe('JSOMP Feedback & Proxy (V1.2)', () => {
  let registry: AtomRegistry;

  beforeEach(async () => {
    await setupJsomp({framework: 'fallback'});
    registry = new AtomRegistry();
  });

  describe('Subscribe Feedback API', () => {
    it('should receive value, set, and patch in JsompAtom subscription', () => {
      const atom = new JsompAtom({count: 10, name: 'test'});
      const spy = vi.fn();
      
      atom.subscribe((val, set, patch) => {
        spy(val, typeof set, typeof patch);
      });

      atom.set({count: 11, name: 'test'});
      
      expect(spy).toHaveBeenCalledWith({count: 11, name: 'test'}, 'function', 'function');
    });

    it('should allow in-place modification via set in AtomRegistry subscription', () => {
      registry.set('count', 10);
      
      registry.subscribe<number>('count', (val, set) => {
         if (val === 11) {
            set(20); // Side effect: when it hits 11, jump to 20
         }
      });

      registry.set('count', 11);
      
      expect(registry.getSnapshot('count')).toBe(20);
    });

    it('should allow partial patch in subscription', () => {
      registry.set('user', {name: 'Alice', age: 25});
      
      registry.subscribe<any>('user', (val, set, patch) => {
         // Add guard to prevent loop: only patch if note is missing
         if (val.age === 26 && !val.note && patch) {
            patch({note: 'birthday'});
         }
      });

      registry.set('user', {name: 'Alice', age: 26});
      
      expect(registry.getSnapshot('user')).toEqual({
        name: 'Alice',
        age: 26,
        note: 'birthday'
      });
    });
  });

  describe('PathAwareProxy (Action Magic)', () => {
    it('should track paths and perform deep updates', () => {
      registry.set('ui', {user: {name: 'Bob', age: 30}});
      
      const proxy = createPathAwareProxy(registry, 'ui.user') as any;
      
      proxy.age++; // 31
      expect(registry.getSnapshot('ui.user.age')).toBe(31);
      
      proxy.name = 'Charlie';
      expect(registry.getSnapshot('ui.user.name')).toBe('Charlie');
    });

    it('should support array mutations', () => {
      registry.set('list', [1, 2, 3]);
      
      const proxy = createPathAwareProxy(registry, 'list') as any;
      
      proxy.push(4);
      expect(registry.getSnapshot('list')).toEqual([1, 2, 3, 4]);
      
      proxy.splice(1, 1, 99); // [1, 99, 3, 4]
      expect(registry.getSnapshot('list')).toEqual([1, 99, 3, 4]);
    });

    it('should support recursive proxying', () => {
       registry.set('a', {b: {c: 1}});
       const proxy = createPathAwareProxy(registry, 'a') as any;
       
       proxy.b.c = 42;
       expect(registry.getSnapshot('a.b.c')).toBe(42);
    });

    it('should work with createActionAtomsProxy', () => {
       registry.set('real.count', 0);
       registry.set('real.user', {name: 'guest'});
       
       const atoms = createActionAtomsProxy(registry, {
          counter: 'real.count',
          user: 'real.user'
       }) as any;
       
       atoms.counter = 5;
       expect(registry.getSnapshot('real.count')).toBe(5);
       
       atoms.user.name = 'admin';
       expect(registry.getSnapshot('real.user.name')).toBe('admin');
    });
  });

  describe('Reactive Propagation', () => {
    it('should notify ancestors when child is changed via proxy', () => {
       const userSpy = vi.fn();
       registry.set('user', {profile: {name: 'A'}});
       registry.subscribe('user', userSpy);
       
       const proxy = createPathAwareProxy(registry, 'user');
       proxy.profile.name = 'B';
       
       expect(userSpy).toHaveBeenCalled();
       expect(registry.getSnapshot('user.profile.name')).toBe('B');
    });

    it('should notify descendants when parent is replaced', () => {
       const nameSpy = vi.fn();
       registry.set('user', {profile: {name: 'A'}});
       registry.subscribe('user.profile.name', nameSpy);
       
       registry.set('user', {profile: {name: 'B'}});
       
       expect(nameSpy).toHaveBeenCalled();
       expect(registry.getSnapshot('user.profile.name')).toBe('B');
    });
  });
});
