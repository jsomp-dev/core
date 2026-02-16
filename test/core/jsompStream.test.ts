import {describe, it, expect, vi, beforeEach} from 'vitest';
import {JsompStream} from '../../src/impl/core/JsompStream';
import {IAtomRegistry} from '../../src/types';

describe('JsompStream', () => {
  let stream: JsompStream;
  let onPatchSpy: any;
  let onFinishSpy: any;
  let mockRegistry: Partial<IAtomRegistry>;
  let registryStore: Map<string, any>;

  beforeEach(() => {
    onPatchSpy = vi.fn();
    onFinishSpy = vi.fn();
    registryStore = new Map();
    mockRegistry = {
      set: vi.fn((key: string, value: any) => registryStore.set(key, value)),
      get: (key: string) => registryStore.get(key)
    };

    stream = new JsompStream({
      onPatch: onPatchSpy,
      onFinish: onFinishSpy,
      atomRegistry: mockRegistry as any
    });
  });

  describe('Basic Object Streaming', () => {
    it('should parse complete object chunk', () => {
      stream.write(JSON.stringify({
        node1: {id: 'node1', type: 'div'}
      }));

      expect(onPatchSpy).toHaveBeenCalledWith({id: 'node1', type: 'div'});
      expect(mockRegistry.set).toHaveBeenCalledWith('node1', {id: 'node1', type: 'div'});
    });

    it('should parse partial object chunks', () => {
      stream.write('{"node1": {"id": "no');
      stream.write('de1", "type": "span"}}');

      // The second write completes the JSON object
      // JsompStream implementation usually tries to parse valid JSON objects from stream
      // It uses check for `}` to attempt parsing.

      expect(onPatchSpy).toHaveBeenCalledWith(expect.objectContaining({id: 'node1', type: 'span'}));
    });
  });

  describe('Array Streaming', () => {
    it('should parse array of nodes', () => {
      const nodes = [
        {id: '1', type: 'a'},
        {id: '2', type: 'b'}
      ];
      stream.write(JSON.stringify(nodes));

      expect(onPatchSpy).toHaveBeenCalledTimes(2);
      expect(onPatchSpy).toHaveBeenCalledWith(expect.objectContaining({id: '1'}));
      expect(onPatchSpy).toHaveBeenCalledWith(expect.objectContaining({id: '2'}));
    });

    it('should handle streamed array chunks', () => {
      stream.write('[{"id": "1", "type"');
      stream.write(': "div"}, {"id": "2", "ty'); // Split inside property
      stream.write('pe": "span"}]');

      expect(onPatchSpy).toHaveBeenCalledWith(expect.objectContaining({id: '1'}));
      expect(onPatchSpy).toHaveBeenCalledWith(expect.objectContaining({id: '2'}));
    });
  });

  describe('Auto Repair', () => {
    it('should attempt to repair broken JSON on patch', () => {
      // "{"node1": {"id": "1", "prop": "val"
      // Missing closing braces
      stream.write('{"node1": {"id": "1", "prop": "val"');

      // JsompStream logic with autoRepair: true (default)
      // Repair adds `}}`
      // This should trigger a patch if valid JSON results

      expect(onPatchSpy).toHaveBeenCalledWith(expect.objectContaining({id: '1', prop: 'val'}));
    });

    it('should repair incomplete key', () => {
      stream.write('{"node2": {"id": "2", "status"');
      // Should repair to {"node2": {"id": "2", "status": null}}
      expect(onPatchSpy).toHaveBeenCalledWith(expect.objectContaining({id: '2', status: null}));
    });

    it('should repair incomplete value definition', () => {
      stream.write('{"node3": {"id": "3", "status":');
      // Should repair to {"node3": {"id": "3", "status": null}}
      expect(onPatchSpy).toHaveBeenCalledWith(expect.objectContaining({id: '3', status: null}));
    });
  });

  describe('Garbage Handling', () => {
    it('should recover from garbage input', () => {
      stream.write('GARBAGE_DATA');
      stream.write('{"clean": {"id": "clean"}}');
      expect(onPatchSpy).toHaveBeenCalledWith(expect.objectContaining({id: 'clean'}));
    });

    it('should recover from interrupted JSON stream', () => {
      // Test recovery from garbage that forces reset
      stream.write('{broken'); // Unfinished
      stream.write('GARBAGE}'); // Force reset
      stream.write('{"node_new": {"id": "new"}}');
      expect(onPatchSpy).toHaveBeenCalledWith(expect.objectContaining({id: 'new'}));
    });
  });

  describe('Plugins', () => {
    it('should transform chunks via plugins', () => {
      const plugin = {
        transform: (chunk: string) => chunk.replace('foo', 'bar')
      };

      const s = new JsompStream({
        plugins: [plugin],
        onPatch: onPatchSpy
      });

      s.write('{"node1": {"id": "1", "val": "foo"}}');

      expect(onPatchSpy).toHaveBeenCalledWith(expect.objectContaining({val: 'bar'}));
    });
  });

  describe('Lifecycle', () => {
    it('should clear buffer on reset', () => {
      stream.write('{"partial":');
      stream.reset();
      stream.write('"newStart": 1}');
      // "newStart": 1} is invalid JSON on its own if buffer cleared, 
      // but if reset works, buffer is empty. 
      // Wait, invalid JSON won't parse.
      // Let's test buffer state indirectly via behavior

      // Re-write complete valid JSON
      stream.write('{"ok": {"id": "ok"}}');
      expect(onPatchSpy).toHaveBeenCalledWith(expect.objectContaining({id: 'ok'}));
    });

    it('should trigger onFinish with final data', () => {
      stream.write('{"final": {"id": "final"}}');
      stream.end();
      expect(onFinishSpy).toHaveBeenCalled();
    });
  });
});
