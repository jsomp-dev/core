import {describe, it, expect, beforeEach} from 'vitest';
import {setupJsomp, BindingResolver, AtomRegistry, ObjectAdapter, ExternalStateRegistry} from '@jsomp/core';

describe('BindingResolver (1.2)', () => {
  let registry: AtomRegistry;

  beforeEach(async () => {
    await setupJsomp();
    registry = new AtomRegistry();
  });

  describe('extractKeys', () => {
    it('should extract simple keys', () => {
      const keys = BindingResolver.extractKeys('Hello {{name}}!');
      expect(keys).toEqual(['name']);
    });

    it('should extract multiple keys', () => {
      const keys = BindingResolver.extractKeys('{{greeting}} {{name}}, welcome to {{place}}!');
      expect(keys).toEqual(['greeting', 'name', 'place']);
    });

    it('should extract keys from deep objects', () => {
      const obj = {
        title: '{{title}}',
        meta: {
          desc: '{{description}}',
          tags: ['{{tag1}}', 'plain', '{{tag2}}']
        }
      };
      const keys = BindingResolver.extractKeys(obj);
      expect(keys.sort()).toEqual(['description', 'tag1', 'tag2', 'title'].sort());
    });
  });

  describe('resolve with Standard AtomRegistry', () => {
    it('should resolve simple string interpolation', () => {
      registry.set('name', {value: 'Alice'});
      const resolved = BindingResolver.resolve('Hello {{name}}!', registry);
      expect(resolved).toBe('Hello Alice!');
    });

    it('should handle missing keys by returning empty string in interpolation', () => {
      const resolved = BindingResolver.resolve('Hello {{unknown}}!', registry);
      expect(resolved).toBe('Hello !');
    });

    it('should resolve pure binding to its native type', () => {
      registry.set('count', {value: 42});
      const resolved = BindingResolver.resolve('{{count}}', registry);
      expect(resolved).toBe(42);
    });

    it('should resolve deep objects recursively', () => {
      registry.set('color', {value: 'red'});
      registry.set('size', {value: 10});
      const obj = {
        style: {color: '{{color}}', fontSize: '{{size}}px'},
        active: true
      };
      const resolved = BindingResolver.resolve(obj, registry);
      expect(resolved).toEqual({
        style: {color: 'red', fontSize: '10px'},
        active: true
      });
    });
  });

  describe('Deep Path Resolution (1.2.1) with ExternalStateRegistry', () => {
    it('should resolve deep paths via ObjectAdapter', () => {
      const store = {
        user: {
          profile: {
            name: 'Bob',
            avatar: 'bob.png'
          }
        }
      };
      const adapter = new ObjectAdapter(store);
      const extRegistry = new ExternalStateRegistry(adapter);

      const resolvedName = BindingResolver.resolve('{{user.profile.name}}', extRegistry);
      expect(resolvedName).toBe('Bob');

      const resolvedAvatar = BindingResolver.resolve('{{user.profile.avatar}}', extRegistry);
      expect(resolvedAvatar).toBe('bob.png');
    });

    it('should return undefined for non-existent deep paths', () => {
      const store = {user: {}};
      const adapter = new ObjectAdapter(store);
      const extRegistry = new ExternalStateRegistry(adapter);

      const resolved = BindingResolver.resolve('{{user.profile.name}}', extRegistry);
      expect(resolved).toBeUndefined(); // Pure binding returns atom value which is undefined
    });
  });

  describe('Type Boundaries (1.2.2)', () => {
    it('should resolve when value type changes from string to object/null', () => {
      registry.set('data', {value: 'initial'});
      expect(BindingResolver.resolve('{{data}}', registry)).toBe('initial');

      registry.set('data', {value: {nested: 'value'}});
      expect(BindingResolver.resolve('{{data}}', registry)).toEqual({nested: 'value'});

      registry.set('data', {value: null});
      expect(BindingResolver.resolve('{{data}}', registry)).toBeNull();
    });
  });
});
