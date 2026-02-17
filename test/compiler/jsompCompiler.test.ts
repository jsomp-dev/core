import {describe, it, expect, vi, beforeEach} from 'vitest';
import {JsompCompiler, PipelineStage, ICompilerContext, setupJsomp} from '@jsomp/core';

describe('JsompCompiler', () => {
  let compiler: JsompCompiler;

  beforeEach(async () => {
    await setupJsomp();
    compiler = new JsompCompiler();
  });

  describe('Pipeline Execution', () => {
    it('should process entities through stages', () => {
      const entities = new Map([
        ['1', {id: '1', type: 'root'}],
        ['2', {id: '2', type: 'child', parent: '1'}]
      ]);

      // Mock plugin
      const plugin = {
        id: 'test-plugin',
        name: 'Test Plugin',
        onNode: vi.fn((id, entity, ctx: ICompilerContext) => {
          ctx.nodes.set(id, {...entity, processed: true} as any);
        })
      };

      compiler.use('test-plugin', PipelineStage.PreProcess, plugin as any);

      const result = compiler.compile(entities, {rootId: '1'});

      // Verify plugin execution
      expect(plugin.onNode).toHaveBeenCalledTimes(2);
      expect(result.length).toBe(1);
      expect((result[0] as any).processed).toBe(true);
    });

    // Correct test with valid stages
    it('should execute plugins in order', () => {
      const entities = new Map([['1', {id: '1', type: 'node'}]]);
      const calls: string[] = [];

      compiler.use('p1', PipelineStage.PreProcess, {
        id: 'p1',
        handler: () => calls.push('p1')
      });

      compiler.use('p2', PipelineStage.ReStructure, {
        id: 'p2',
        handler: () => calls.push('p2')
      });

      compiler.compile(entities);
      expect(calls).toEqual(['p1', 'p2']);
    });
  });

  describe('Batch vs Global Plugins', () => {
    it('should run batch plugins for each node', () => {
      const entities = new Map([
        ['1', {id: '1'}],
        ['2', {id: '2'}]
      ]);

      const visitSpy = vi.fn();
      compiler.use('batch-p', PipelineStage.PreProcess, {
        id: 'batch',
        onNode: visitSpy
      });

      compiler.compile(entities);
      expect(visitSpy).toHaveBeenCalledTimes(2);
      expect(visitSpy).toHaveBeenCalledWith('1', expect.anything(), expect.anything());
      expect(visitSpy).toHaveBeenCalledWith('2', expect.anything(), expect.anything());
    });
  });

  describe('Result Extraction', () => {
    it('should extract root nodes by default', () => {
      const entities = new Map([
        ['app', {id: 'app', type: 'div'}],
        ['child', {id: 'child', parent: 'app'}]
      ]);

      // Use a simple plugin to populate nodes map from entities
      compiler.use('populator', PipelineStage.PreProcess, {
        id: 'populator',
        onNode: (id, entity, ctx) => {
          ctx.nodes.set(id, {...entity} as any);
        }
      });

      const result = compiler.compile(entities, {rootId: 'app'});
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('app');
    });

    it('should allow manually setting result in context', () => {
      const entities = new Map();
      compiler.use('manual-result', PipelineStage.Hydrate, {
        id: 'manual',
        handler: (ctx: ICompilerContext) => {
          ctx.result = [{id: 'manual-root', type: 'test', children: []}];
        }
      });

      const result = compiler.compile(entities);
      expect(result[0].id).toBe('manual-root');
    });
  });

  describe('Configuration', () => {
    it('should accept plugins in constructor', () => {
      const spy = vi.fn();
      const c = new JsompCompiler({
        plugins: [{
          id: 'ctor-plugin',
          stage: PipelineStage.PreProcess,
          handler: spy
        }]
      });

      c.compile(new Map());
      expect(spy).toHaveBeenCalled();
    });
  });
});
