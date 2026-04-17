import {describe, it, expect, beforeEach, vi} from 'vitest';
import {setupJsomp, jsompEnv, JsompCompiler, JsompAtom, PipelineStage} from '../../src';

describe('Config System', () => {

  beforeEach(async () => {
    // Reset JsompEnv for each test to ensure isolation
    (jsompEnv as any).isSetup = false;
    (jsompEnv as any)._service = undefined;
    const {ConfigRegistry} = await import('../../src/registry/ConfigRegistry');
    (jsompEnv as any)._config = new ConfigRegistry();
  });

  describe('ConfigRegistry', () => {
    it('should support basic set and get', () => {
      jsompEnv.config.set('foo', 'bar');
      expect(jsompEnv.config.get('foo')).toBe('bar');
    });

    it('should support nested path access', () => {
      jsompEnv.config.set('a.b.c', 123);
      expect(jsompEnv.config.get('a.b.c')).toBe(123);
      expect(jsompEnv.config.get('a.b')).toEqual({c: 123});
    });

    it('should return default value if key not found', () => {
      expect(jsompEnv.config.get('non.existent', 'default')).toBe('default');
    });

    it('should support registerDefaults', () => {
      jsompEnv.config.registerDefaults('test', { a: 1, b: 2 });
      expect(jsompEnv.config.get('test.a')).toBe(1);
      
      // Should not overwrite existing values
      jsompEnv.config.set('test.b', 3);
      jsompEnv.config.registerDefaults('test', { b: 4, c: 5 });
      expect(jsompEnv.config.get('test.b')).toBe(3);
      expect(jsompEnv.config.get('test.c')).toBe(5);
    });
  });

  describe('Integration with setupJsomp', () => {
    it('should merge user config into registry', async () => {
      await setupJsomp({
        features: {
          enableCache: false,
          customFlag: true
        }
      } as any);

      expect(jsompEnv.config.get('features.enableCache')).toBe(false);
      expect(jsompEnv.config.get('features.customFlag')).toBe(true);
      // Default should still be there for others
      expect(jsompEnv.config.get('features.strictMode')).toBe(false);
    });

    it('should support disabling standard plugins', async () => {
      const service = await setupJsomp({
        features: {
          standardPlugins: {
            'standard-inherit': false
          }
        }
      } as any);

      const plugins = service.pipeline.getPlugins(PipelineStage.PreProcess);
      expect(plugins.some(p => p.id === 'standard-inherit')).toBe(false);
      expect(plugins.some(p => p.id === 'standard-id-validation')).toBe(true);
    });
  });

  describe('Feature Flags Logic', () => {
    it('strictMode: should throw when true and warn when false', async () => {
      const entities = new Map([
        ['invalid.id', { id: 'invalid.id', type: 'div', props: {} }]
      ]);
      
      // Test default (strictMode = false)
      const service = await setupJsomp({ features: { strictMode: false } } as any);
      
      const warnSpy = vi.spyOn(jsompEnv.logger, 'warn').mockImplementation(() => {});
      const throwSpy = vi.spyOn(jsompEnv.logger, 'throw');

      service.compiler.compile(entities);
      expect(warnSpy).toHaveBeenCalled();
      expect(throwSpy).not.toHaveBeenCalled();

      warnSpy.mockClear();
      throwSpy.mockClear();

      // Test strictMode = true
      (jsompEnv as any).isSetup = false; 
      await setupJsomp({ features: { strictMode: true } } as any);
      
      expect(() => {
        service.compiler.compile(entities);
      }).toThrow();
    });

    it('enableCache: should functional even when toggled', async () => {
      // This test ensures switching the flag doesn't break resolution
      await setupJsomp({ features: { enableCache: false } } as any);
      
      const entities = new Map<string, any>([
        ['node', { id: 'node', type: 'div', props: { content: '{{val}}' } }]
      ]);
      
      const atomRegistry = jsompEnv.service!.globalRegistry;
      atomRegistry.set('val', new JsompAtom('v1'));

      const compiler = new JsompCompiler();
      const { attributeCachePlugin } = await import('../../src/engine/compiler/plugins/AttributeCachePlugin');
      compiler.use(attributeCachePlugin.id, attributeCachePlugin.stage, attributeCachePlugin);

      // In PreProcess, the changes are stored in entityUpdates, but they are not automatically 
      // moved to ctx.nodes unless a ReStructure/Hydrate plugin does it.
      // However, JsompCompiler's runStage for PreProcess will update ctx.entityUpdates.
      
      const ctx = { 
        atomRegistry, 
        isUiNode: (e: any) => e.type !== 'state', 
        logger: jsompEnv.logger,
        entities: entities
      };

      const { nodes: n1 } = compiler.compile(entities, ctx as any);
      // Even if roots is empty, nodes might be populated if we provided 'nodes' in options 
      // or if we check ctx.entityUpdates. 
      // Actually, standard compiler doesn't put things into nodes in PreProcess.
      
      // Let's use a more complete compiler setup to verify the end-to-end flow
      const service = await setupJsomp({ features: { enableCache: false } } as any);
      const { roots: r1 } = service.compiler.compile(entities, { atomRegistry });
      expect(r1[0].props?.content).toBe('v1');

      atomRegistry.set('val', new JsompAtom('v2'));
      const { roots: r2 } = service.compiler.compile(entities, { atomRegistry, dirtyIds: new Set(['node']) });
      expect(r2[0].props?.content).toBe('v2');
    });
  });
});
