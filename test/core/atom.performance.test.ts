import {describe, it, expect, beforeEach, beforeAll} from 'vitest';
import {AtomRegistry, BindingResolver, setupJsomp} from "../../src";
import {SignalCenter, JsompRuntime} from "../../src/engine";

describe('JSOMP 1.1/1.2 Atom Performance (Path-Based Backtracking)', () => {
  let registry: AtomRegistry;
  let signalCenter: SignalCenter;

  beforeAll(async () => {
    await setupJsomp({framework: 'fallback'});
  });

  beforeEach(() => {
    registry = new AtomRegistry();
    signalCenter = new SignalCenter();
  });

  describe('Path-Backtracking Overhead', () => {
    it('Should resolve deep path backtrack within 0.1ms (Average)', () => {
      // 1. Setup 10 level deep data
      registry.set('a.b.c.d.e.f.g.h.i.j.key', 'Value J');
      registry.set('a.b.c.key', 'Value C');
      registry.set('key', 'Value Root');

      const stack = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
      
      const count = 10000;
      const start = performance.now();
      
      for (let i = 0; i < count; i++) {
        // Deep resolution
        BindingResolver.resolve('{{key}}', registry, stack);
        // Middle resolution
        BindingResolver.resolve('{{key}}', registry, stack.slice(0, 5));
        // Global resolution
        BindingResolver.resolve('{{key}}', registry, []);
      }
      
      const end = performance.now();
      const avg = (end - start) / (count * 3);
      console.log(`[Perf] Average Backtracking Resolution: ${avg.toFixed(4)}ms (StackDepth: 10)`);
      
      expect(avg).toBeLessThan(0.05); // Target: < 0.05ms per resolution
    });
  });

  describe('Signal Bubbling & Large State Hydration', () => {
    it('Should hydrate and bubble 1000 nodes deep object in reasonable time', async () => {
      const runtime = new JsompRuntime();
      runtime.use(signalCenter);
      runtime.setRegistryFallback(registry);

      // Create a large nodes pool
      const nodes: Record<string, any> = {};
      for (let i = 0; i < 1000; i++) {
        nodes[`node_${i}`] = {
           id: `node_${i}`,
           name: `Node Name ${i}`,
           meta: {
              index: i,
              tags: ['tag1', 'tag2']
           }
        };
      }

      const start = performance.now();
      // Hydrate via workspace root (This triggers 1.1 deep expansion and bubbling)
      registry.set('workspace', { list: {}, nodes, active: 'node_0' });
      const end = performance.now();
      
      console.log(`[Perf] 1000 items object hydration and bubbling: ${(end - start).toFixed(2)}ms`);
      
      // Wait for signal center batching
      await new Promise(r => setTimeout(r, 10));
      
      expect(signalCenter.get('workspace.nodes.node_999.name')).toBe('Node Name 999');
      expect(end - start).toBeLessThan(100); // Hydration should be fast (POJO set is fast)
    });
  });

  describe('Cross-Registry Sync Stress', () => {
    it('Should prevent infinite loop while maintaining sync throughput', async () => {
      const runtime = new JsompRuntime();
      runtime.use(signalCenter);
      runtime.setRegistryFallback(registry);

      let syncCount = 0;
      signalCenter.subscribe(() => {
        syncCount++;
      });

      const start = performance.now();
      const iterations = 500;
      
      for (let i = 0; i < iterations; i++) {
        // 1. External -> Internal
        registry.set('test_key', i);
        
        // 2. Internal -> External (via adapter)
        const adapter: any = (runtime as any)._pipelineContext.registry;
        adapter.set('test_key', i + 1);
      }
      
      const end = performance.now();
      console.log(`[Perf] 500 double-sync cycles: ${(end - start).toFixed(2)}ms, SyncEvents: ${syncCount}`);
      
      expect(syncCount).toBeLessThan(iterations * 3); // No infinite loop loop
      expect(registry.get('test_key')).toBe(iterations); // Latest value from internal set
    });
  });
});
