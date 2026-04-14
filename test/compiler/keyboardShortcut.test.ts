import {beforeAll, beforeEach, describe, expect, it, vi} from 'vitest';
import {ActionRegistry, JsompCompiler, PipelineStage, setupJsomp} from '../../src';
import {actionTagsPlugin, incrementalDiscoveryPlugin} from '../../src/engine';

describe('Keyboard Shortcut Implementation (Native Rules)', () => {
  let compiler: JsompCompiler;
  let actionRegistry: ActionRegistry;

  beforeAll(async () => {
    await setupJsomp();
  });

  beforeEach(() => {
    actionRegistry = new ActionRegistry();
    compiler = new JsompCompiler();
    
    // Explicitly register required plugins in order
    compiler.use('incremental', PipelineStage.ReStructure, incrementalDiscoveryPlugin);
    compiler.use('actions', PipelineStage.Hydrate, actionTagsPlugin);
  });

  it('should register onKeyDown handler when key: trigger is used', async () => {
    const handler = vi.fn();
    actionRegistry.register('save', handler);

    const entities = new Map<string, any>([
      ['btn', {
        id: 'btn',
        type: 'button',
        actions: { 'save': ['key:ctrl+s'] }
      }]
    ]);

    const {roots} = compiler.compile(entities, { 
      rootId: 'btn',
      actionRegistry 
    });
    
    const node = roots[0] as any;
    expect(node).toBeDefined();
    expect(node.onEvent.onKeyDown).toBeDefined();
    
    // Test match
    const matchEvent = {
       key: 's',
       ctrlKey: true,
       shiftKey: false,
       altKey: false,
       metaKey: false,
       preventDefault: vi.fn(),
       stopPropagation: vi.fn()
    };
    
    await node.onEvent.onKeyDown(matchEvent);
    expect(handler).toHaveBeenCalled();
    expect(matchEvent.preventDefault).toHaveBeenCalled();
  });

  it('should support system:ignore for intercepting keys', async () => {
    const entities = new Map<string, any>([
      ['overlay', {
        id: 'overlay',
        type: 'div',
        actions: { 
           'system:ignore': ['key:f5', 'click']
        }
      }]
    ]);

    const {roots} = compiler.compile(entities, { 
      rootId: 'overlay',
      actionRegistry 
    });
    
    const node = roots[0] as any;
    expect(node.onEvent.onKeyDown).toBeDefined();

    // Test F5 ignore
    const f5Event = {
       key: 'f5',
       ctrlKey: false,
       shiftKey: false,
       altKey: false,
       metaKey: false,
       preventDefault: vi.fn(),
       stopPropagation: vi.fn()
    };
    await node.onEvent.onKeyDown(f5Event);
    expect(f5Event.preventDefault).toHaveBeenCalled();
    
    // Test Click ignore
    const clickEvent = {
       preventDefault: vi.fn(),
       stopPropagation: vi.fn()
    };
    await node.onEvent.click(clickEvent);
    expect(clickEvent.preventDefault).toHaveBeenCalled();
  });
});
