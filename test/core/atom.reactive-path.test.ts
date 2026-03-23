import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignalCenter } from '../../src/engine/headless/SignalCenter';
import { AtomRegistry } from '../../src/state/AtomRegistry';

describe('V1.1 Reactive Path Space (Atom V2)', () => {
  describe('SignalCenter (Root Engine)', () => {
    let sc: SignalCenter;

    beforeEach(() => {
      sc = new SignalCenter();
    });

    it('should support dot-notation get/set', () => {
      sc.onUpdate('user.profile.age', 18);
      expect(sc.get('user.profile.age')).toBe(18);
      expect(sc.get('user')).toEqual({ profile: { age: 18 } });
    });

    it('should bubble dirty IDs on update', async () => {
      const spy = vi.fn();
      sc.subscribe(spy);
      
      sc.onUpdate('a.b.c', 100);
      
      // Since it's async (queueMicrotask), we wait for the batch to dispatch
      await new Promise(r => setTimeout(r, 0));
      
      expect(spy).toHaveBeenCalled();
      const dirtyIds = spy.mock.calls[0][0];
      expect(dirtyIds).toContain('a');
      expect(dirtyIds).toContain('a.b');
      expect(dirtyIds).toContain('a.b.c');
    });

    it('should handle incremental patch', async () => {
      sc.onUpdate('user', { name: 'Alice', settings: { theme: 'dark' } });
      
      const spy = vi.fn();
      sc.subscribe(spy);
      
      sc.patch('user.settings', { theme: 'light' });
      
      await new Promise(r => setTimeout(r, 0));
      
      expect(sc.get('user.settings.theme')).toBe('light');
      expect(sc.get('user.name')).toBe('Alice'); // Unaffected
      
      const dirtyIds = spy.mock.calls[0][0];
      expect(dirtyIds).toContain('user.settings.theme');
      expect(dirtyIds).toContain('user.settings');
      expect(dirtyIds).toContain('user');
    });

    it('should support path-based versioning (Bubble Versioning)', () => {
      sc.onUpdate('user', { age: 10 });
      const versionV1 = sc.getVersion('user.age');
      
      // Update parent
      sc.onUpdate('user', { age: 20 });
      const versionV2 = sc.getVersion('user.age');
      
      expect(versionV2).toBeGreaterThan(versionV1);
    });

    it('should return snapshot for specific paths', () => {
      sc.onUpdate('user', { profile: { age: 18 } });
      const snapshot = sc.getSnapshot('user.profile');
      expect(snapshot).toEqual({ age: 18 });
      // snapshot should be a copy (shallow for now in implementation)
      expect(snapshot).not.toBe(sc.get('user.profile')); 
    });
  });

  describe('AtomRegistry (Dispatcher Surface)', () => {
    let registry: AtomRegistry;

    beforeEach(() => {
      registry = new AtomRegistry();
    });

    it('should support deep path get (Deep Registration)', () => {
      registry.set('user', { profile: { age: 25 } });
      expect(registry.get('user.profile.age')).toBe(25);
    });

    it('should support inverse deep set (Structured Sync)', () => {
      registry.set('user', { profile: { age: 10 } });
      registry.set('user.profile.age', 20);
      
      expect(registry.get('user.profile.age')).toBe(20);
      const user = registry.get('user') as any;
      expect(user.profile.age).toBe(20);
    });

    it('should support descendant notification propagation', () => {
      const spy = vi.fn();
      registry.subscribe('user.profile.age', spy);
      
      // Update root should trigger children listeners
      registry.set('user', { profile: { age: 18 } });
      expect(spy).toHaveBeenCalled();
    });

    it('should support ancestor notification bubbling', () => {
      const spy = vi.fn();
      registry.subscribe('user', spy);
      
      // Update leaf should trigger parent listeners
      registry.set('user.profile.age', 30);
      expect(spy).toHaveBeenCalled();
    });

    it('should support getSnapshot for paths', () => {
      registry.set('user', { name: 'Alice' });
      expect(registry.getSnapshot('user.name')).toBe('Alice');
    });
  });
});
