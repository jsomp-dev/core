import {beforeAll, describe, expect, it} from 'vitest';
import {JsompRuntime, SignalCenter} from '../../src/engine';
import {setupJsomp} from '../../src';

describe('Headless Core Benchmark & Extreme Cases', () => {
  let service: any;

  beforeAll(async () => {
    // Standard initialization to ensure logger and standard plugins are registered
    service = await setupJsomp();
  });

  it('Should build a large logic tree (2000 nodes) within 50ms', () => {
    // Create compiler from service to ensure standard plugins (like IncrementalDiscovery) are used
    const runtime = new JsompRuntime(service.createCompiler());
    const entities = new Map<string, any>();

    // Generate 2000 nodes with a hierarchical structure
    for (let i = 0; i < 2000; i++) {
      entities.set(`node_${i}`, {
        id: `node_${i}`,
        type: 'Box',
        parent: i === 0 ? null : `node_${Math.floor((i - 1) / 5)}`, // Tree with branching factor 5
        props: {index: i}
      });
    }

    const start = performance.now();
    runtime.feed(entities);
    const end = performance.now();

    const duration = end - start;
    console.log(`[Benchmark] 2000 nodes build duration: ${duration.toFixed(2)}ms`);

    expect(duration).toBeLessThan(60); // Target is 50ms, but buffer for dev/CI environments
    expect(runtime.getSnapshot().allNodes.length).toBe(2000);
  });

  it('Should handle high-frequency streaming updates stably', async () => {
    const runtime = new JsompRuntime(service.createCompiler());
    const signalCenter = new SignalCenter();
    runtime.use(signalCenter);

    const entities = new Map<string, any>();
    entities.set('root', {id: 'root', type: 'Box'});
    runtime.feed(entities);

    const updateCount = 100;

    for (let i = 0; i < updateCount; i++) {
      // Simulate rapid structural updates to a single node
      signalCenter.onUpdate('root', {id: 'root', type: 'Box', props: {count: i}});
    }

    // Wait for the microtask batching to trigger
    await new Promise(resolve => setTimeout(resolve, 50));

    const snapshot = runtime.getSnapshot();
    console.log(`[Benchmark] ${updateCount} high-freq updates processed. Version: ${snapshot.version}`);

    // Batching should result in very few reconciliations (usually 1 or 2)
    expect(snapshot.version).toBeLessThan(5);
    expect(snapshot.allNodes.find(n => n.id === 'root')?.props?.count).toBe(updateCount - 1);
  });

  it('Should achieve topology self-healing with out-of-order injection', () => {
    const runtime = new JsompRuntime(service.createCompiler());

    // 1. Inject child first (Orphan context)
    const childEntities = new Map<string, any>();
    childEntities.set('child_1', {id: 'child_1', type: 'Box', parent: 'parent_1'});

    runtime.feed(childEntities);
    let snapshot = runtime.getSnapshot();
    expect(snapshot.allNodes.length).toBe(1);

    // 2. Inject parent later
    const parentEntities = new Map<string, any>();
    parentEntities.set('parent_1', {id: 'parent_1', type: 'Box', parent: null});

    runtime.feed(parentEntities);
    snapshot = runtime.getSnapshot();

    expect(snapshot.allNodes.length).toBe(2);
    const child = snapshot.allNodes.find(n => n.id === 'child_1');
    const parent = snapshot.allNodes.find(n => n.id === 'parent_1');

    expect(child?.parent).toBe('parent_1');
    expect(parent?.id).toBe('parent_1');
  });
});
