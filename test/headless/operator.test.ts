import {beforeEach, describe, expect, it} from 'vitest';
import {JsompRuntime, SignalCenter} from '../../src/engine';
import {setupJsomp} from '../../src';

describe('Headless Operator Expressions', () => {
  let runtime: JsompRuntime;
  let center: SignalCenter;

  beforeEach(async () => {
    const service = await setupJsomp({framework: 'fallback'});
    const compiler = service.createCompiler();

    runtime = new JsompRuntime(compiler);
    center = new SignalCenter();
    runtime.use(center);
  });

  it('should handle "not" operator correctly', async () => {
    const id = 'test-not';
    center.onUpdate('isCollapsed', true);

    const entities = new Map();
    entities.set(id, {
      id,
      type: 'view',
      props: {
        isVisible: { opType: 'not', target: '{{isCollapsed}}' }
      }
    });

    runtime.feed(entities);
    let desc = runtime.getSnapshot().descriptors!.find(d => d.id === id)!;
    expect(desc.props.isVisible).toBe(false);

    center.onUpdate('isCollapsed', false);
    // Wait for microtask tick as SignalCenter notifications are typically async or batch
    await new Promise(r => setTimeout(r, 0));
    
    desc = runtime.getSnapshot().descriptors!.find(d => d.id === id)!;
    expect(desc.props.isVisible).toBe(true);
  });

  it('should handle arithmetic "add" operator correctly', async () => {
    const id = 'test-add';
    center.onUpdate('count', 10);

    const entities = new Map();
    entities.set(id, {
      id,
      type: 'view',
      props: {
        total: { opType: 'add', target: '{{count}}', value: 5 }
      }
    });

    runtime.feed(entities);
    let desc = runtime.getSnapshot().descriptors!.find(d => d.id === id)!;
    expect(desc.props.total).toBe(15);

    center.onUpdate('count', 20);
    await new Promise(r => setTimeout(r, 0));
    
    desc = runtime.getSnapshot().descriptors!.find(d => d.id === id)!;
    expect(desc.props.total).toBe(25);
  });

  it('should handle "if" operator with complex conditions', async () => {
    const id = 'test-if';
    center.onUpdate('score', 85);

    const entities = new Map();
    entities.set(id, {
      id,
      type: 'text',
      props: {
        status: { 
          opType: 'if', 
          target: '{{score}}', 
          test: { compare: '>=', value: 60 },
          then: 'Passed',
          else: 'Failed'
        }
      }
    });

    runtime.feed(entities);
    let desc = runtime.getSnapshot().descriptors!.find(d => d.id === id)!;
    expect(desc.props.status).toBe('Passed');

    center.onUpdate('score', 40);
    await new Promise(r => setTimeout(r, 0));
    
    desc = runtime.getSnapshot().descriptors!.find(d => d.id === id)!;
    expect(desc.props.status).toBe('Failed');
  });

  it('should handle "match" operator correctly', async () => {
    const id = 'test-match';
    center.onUpdate('role', 'admin');

    const entities = new Map();
    entities.set(id, {
      id,
      type: 'text',
      props: {
        label: { 
          opType: 'match', 
          target: '{{role}}', 
          cases: [
            { value: 'admin', return: 'Administrator' },
            { value: 'user', return: 'Standard User' }
          ],
          default: 'Guest'
        }
      }
    });

    runtime.feed(entities);
    let desc = runtime.getSnapshot().descriptors!.find(d => d.id === id)!;
    expect(desc.props.label).toBe('Administrator');

    center.onUpdate('role', 'user');
    await new Promise(r => setTimeout(r, 0));
    desc = runtime.getSnapshot().descriptors!.find(d => d.id === id)!;
    expect(desc.props.label).toBe('Standard User');

    center.onUpdate('role', 'unknown');
    await new Promise(r => setTimeout(r, 0));
    desc = runtime.getSnapshot().descriptors!.find(d => d.id === id)!;
    expect(desc.props.label).toBe('Guest');
  });

  it('should handle "pipeline" with chain of operations', async () => {
    const id = 'test-pipeline';
    center.onUpdate('price', 100);

    const entities = new Map();
    entities.set(id, {
      id,
      type: 'text',
      props: {
        finalPrice: {
          opType: 'pipeline',
          target: '{{price}}',
          steps: [
            { opType: 'mult', value: 1.1 }, // +10% tax
            { opType: 'add', value: 5 },    // +5 shipping
            { opType: 'if', test: { compare: '>', value: 100 }, then: 100, else: '{{$value}}' } // cap at 100
          ]
        }
      }
    });

    runtime.feed(entities);
    let desc = runtime.getSnapshot().descriptors!.find(d => d.id === id)!;
    // (100 * 1.1) + 5 = 115. But capped at 100.
    expect(desc.props.finalPrice).toBe(100);

    center.onUpdate('price', 50);
    await new Promise(r => setTimeout(r, 0));
    desc = runtime.getSnapshot().descriptors!.find(d => d.id === id)!;
    // (50 * 1.1) + 5 = 60. Not capped.
    expect(desc.props.finalPrice).toBeCloseTo(60);
  });

  it('should support nesting operators', async () => {
    const id = 'test-nesting';
    center.onUpdate('a', 1);
    center.onUpdate('b', 2);

    const entities = new Map();
    entities.set(id, {
      id,
      type: 'view',
      props: {
        result: {
          opType: 'add',
          target: { opType: 'mult', target: '{{a}}', value: 10 },
          value: '{{b}}'
        }
      }
    });

    runtime.feed(entities);
    let desc = runtime.getSnapshot().descriptors!.find(d => d.id === id)!;
    expect(desc.props.result).toBe(12);

    center.onUpdate('a', 5);
    await new Promise(r => setTimeout(r, 0));
    desc = runtime.getSnapshot().descriptors!.find(d => d.id === id)!;
    expect(desc.props.result).toBe(52);
  });
});
