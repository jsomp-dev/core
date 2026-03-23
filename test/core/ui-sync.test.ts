import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SignalCenter } from '../../src/engine/headless/SignalCenter';
import { AtomRegistry } from '../../src/state/AtomRegistry';
import { setupJsomp } from '../../src/setup';
import { JsompRuntime } from '../../src/engine/headless/JsompRuntime';

describe('AtomRegistry - SignalCenter UI Sync Integration', () => {
    let sc: SignalCenter;
    let registry: AtomRegistry;
    let runtime: JsompRuntime;

    beforeEach(async () => {
        await setupJsomp();
        sc = new SignalCenter();
        registry = new AtomRegistry();
        runtime = new JsompRuntime();

        // Simulate JsompHost bridge: Link registry to runtime/SignalCenter
        registry.subscribeAll((key, value) => {
            sc.onUpdate(key, value);
        });

        runtime.use(sc);
    });

    it('should trigger UI update when using registry.set on a deep path', async () => {
        const spy = vi.fn();
        sc.subscribe(spy);

        // 1. Initial state
        registry.set('workspace', { nodes: { 'node-1': { id: 'node-1', name: 'Original' } } });
        
        // Wait for microtask (sc.dispatch)
        await new Promise(r => setTimeout(r, 0));
        spy.mockClear();

        // 2. Act: Set deep path via registry
        registry.set('workspace.nodes.node-1.name', 'Updated');

        // 3. Assert: SignalCenter should have received the update and triggered subscribers
        await new Promise(r => setTimeout(r, 0));
        
        expect(spy).toHaveBeenCalled();
        const dirtyIds = spy.mock.calls[0][0];
        expect(dirtyIds).toContain('workspace.nodes.node-1.name');
        expect(dirtyIds).toContain('workspace.nodes.node-1');
        expect(dirtyIds).toContain('workspace');
        
        // Data check in SC
        expect(sc.get('workspace.nodes.node-1.name')).toBe('Updated');
    });

    it('should trigger UI update when using registry.set on a root key containing objects', async () => {
        const spy = vi.fn();
        sc.subscribe(spy);

        registry.set('workspace', { list: {} });
        await new Promise(r => setTimeout(r, 0));
        spy.mockClear();

        // Update root
        registry.set('workspace', { list: { 'ws-1': { id: 'ws-1' } } });

        await new Promise(r => setTimeout(r, 0));
        expect(spy).toHaveBeenCalled();
        expect(spy.mock.calls[0][0]).toContain('workspace');
        expect(sc.get('workspace.list.ws-1.id')).toBe('ws-1');
    });

    it('should trigger UI update when using registry.patch', async () => {
        const spy = vi.fn();
        sc.subscribe(spy);

        registry.set('workspace', { active: 'none' });
        await new Promise(r => setTimeout(r, 0));
        spy.mockClear();

        // Patch
        registry.patch('workspace', { active: 'ws-1' });

        await new Promise(r => setTimeout(r, 0));
        expect(spy).toHaveBeenCalled();
        expect(sc.get('workspace.active')).toBe('ws-1');
    });
});
