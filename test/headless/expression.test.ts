import {beforeEach, describe, expect, it} from 'vitest';
import {JsompRuntime, SignalCenter} from '../../src/headless';
import {setupJsomp} from '../../src';

describe('Headless Expression Resolution', () => {
  let runtime: JsompRuntime;
  let center: SignalCenter;

  beforeEach(async () => {
    const service = await setupJsomp();
    // Use service to create compiler so it has all registered plugins (including TreeAssembly & Dependency)
    const compiler = service.createCompiler();

    runtime = new JsompRuntime(compiler);
    center = new SignalCenter();
    runtime.use(center);

    // Inject resolver to ensure contentTrait works as expected
    (runtime as any)._pipelineContext.resolver = {
      resolve: (content: string, context: any) => {
        if (typeof content !== 'string') return content;
        return content.replace(/\{\{(.*?)\}\}/g, (_, key) => {
          const val = center.get(key.trim());
          return val !== undefined ? String(val) : '';
        });
      }
    };
  });

  it('should resolve expressions in content', async () => {
    const id = 'test-node';
    center.onUpdate('user.name', 'Alice');

    const nodes = new Map();
    nodes.set(id, {
      id,
      type: 'text',
      props: {
        content: 'Hello, {{user.name}}!'
      }
    });

    runtime.feed(nodes);

    const snap1 = runtime.getSnapshot();
    const desc1 = snap1.descriptors?.find(d => d.id === id);

    expect(desc1?.props.content).toBe('Hello, Alice!');

    // Update Atom
    center.onUpdate('user.name', 'Bob');

    await new Promise(resolve => setTimeout(resolve, 0)); // Microtask

    const snap2 = runtime.getSnapshot();
    const desc2 = snap2.descriptors?.find(d => d.id === id);

    expect(snap2.version).toBeGreaterThan(snap1.version);
    expect(desc2?.props.content).toBe('Hello, Bob!');
  });
});
