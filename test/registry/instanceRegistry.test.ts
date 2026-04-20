import {beforeEach, describe, expect, it, vi} from 'vitest';
import {InstanceRegistry, IRuntimeAdapter, REMOTE_INSTANCE} from '../../src';

describe('InstanceRegistry', () => {
  let registry: InstanceRegistry;

  beforeEach(() => {
    registry = new InstanceRegistry();
  });

  describe('Basic operations', () => {
    it('should set and get local instances by ID', () => {
      const instance = {name: 'test'};
      registry.set('node1', instance);
      expect(registry.get('node1')).toBe(instance);
    });

    it('should set and get local instances by Path', () => {
      const instance = {name: 'test'};
      registry.set('node1', instance, 'root.parent.child');
      expect(registry.get('root.parent.child')).toBe(instance);
      expect(registry.get('node1')).toBe(instance);
    });

    it('should return undefined for non-existent instances', () => {
      expect(registry.get('ghost')).toBeUndefined();
    });

    it('should handle removing instances', () => {
      const instance = {name: 'test'};
      registry.set('node1', instance);
      registry.remove('node1');
      expect(registry.get('node1')).toBeUndefined();
    });

    it('should clear all instances', () => {
      registry.set('node1', {});
      registry.set('node2', {}, 'path2');
      registry.clear();
      expect(registry.getIds()).toHaveLength(0);
      expect(registry.getPaths()).toHaveLength(0);
    });
  });

  describe('Hierarchical backoff', () => {
    it('should resolve relative paths using contextPath', () => {
      const instance = {name: 'target'};
      registry.set('node1', instance, 'a.b.c');

      // Relative lookup from a.b.d should find a.b.c if we look for 'c'
      // Resolve logic:
      // 1. a.b.d.c -> fail
      // 2. a.b.c -> success!
      expect(registry.get('c', 'a.b.d')).toBe(instance);
    });

    it('should resolve deep paths', () => {
      const instance = {name: 'deep'};
      registry.set('node1', instance, 'root.sub.target');

      expect(registry.get('target', 'root.sub.other')).toBe(instance);
      expect(registry.get('sub.target', 'root.other')).toBe(instance);
    });
  });

  describe('Remote Mode (Proxy)', () => {
    it('should return a proxy for remote instances', () => {
      registry.set('node1', REMOTE_INSTANCE);
      const proxy = registry.get('node1');

      expect(proxy).toBeDefined();
      expect(proxy.__jsomp_is_remote).toBe(true);
      expect(proxy.__jsomp_id).toBe('node1');
    });

    it('should route method calls to adapter', async () => {
      const adapter: IRuntimeAdapter = {
        invokeMethod: vi.fn().mockResolvedValue('success'),
        currentContext: {} as any,
        subscribe: vi.fn(() => () => { }),
        getSnapshot: vi.fn(),
        feed: vi.fn(),
        getVersion: vi.fn(),
        reportInstance: vi.fn(),
      };
      registry.setAdapter(adapter);
      registry.set('node1', REMOTE_INSTANCE);

      const proxy = registry.get('node1');
      const result = await proxy.someMethod(1, 2, 3);

      expect(adapter.invokeMethod).toHaveBeenCalledWith('node1', 'someMethod', [1, 2, 3]);
      expect(result).toBe('success');
    });
  });

  describe('Subscriptions (on)', () => {
    it('should trigger immediately if instance exists', () => {
      const instance = {name: 'test'};
      registry.set('node1', instance);

      const callback = vi.fn();
      registry.on('node1', callback);

      expect(callback).toHaveBeenCalledWith(instance);
    });

    it('should trigger when instance is set later', () => {
      const callback = vi.fn();
      registry.on('node1', callback);
      expect(callback).not.toHaveBeenCalled();

      const instance = {name: 'test'};
      registry.set('node1', instance);
      expect(callback).toHaveBeenCalledWith(instance);
    });

    it('should trigger with proxy for remote instances', () => {
      registry.set('node1', REMOTE_INSTANCE);
      const callback = vi.fn();
      registry.on('node1', callback);

      const proxy = callback.mock.calls[0][0];
      expect(proxy.__jsomp_is_remote).toBe(true);
    });

    it('should unsubscribe correctly', () => {
      const callback = vi.fn();
      const unsub = registry.on('node1', callback);

      unsub();
      registry.set('node1', {});
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
