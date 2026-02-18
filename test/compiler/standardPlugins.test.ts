import {describe, it, expect, beforeEach, beforeAll, vi} from 'vitest';
import {
  JsompCompiler,
  PipelineStage,
  setupJsomp,
  JsompAtom
} from '../../src/index';
import {
  inheritPlugin,
  pathResolutionPlugin,
  incrementalDiscoveryPlugin,
  treeAssemblyPlugin,
  attributeCachePlugin,
  recursionGuardPlugin,
  actionTagsPlugin,
  autoSyncPlugin,
  stateHydrationPlugin
} from '../../src/impl/compiler/plugins/index';
import {jsompEnv} from '../../src/JsompEnv';

describe('JSOMP Standard Plugins (V2 Optimization Suite)', () => {
  let compiler: JsompCompiler;

  beforeAll(async () => {
    await setupJsomp();
  });

  beforeEach(() => {
    compiler = new JsompCompiler();

    // Explicitly register plugins to match setup.ts (Production Order)
    compiler.use('inherit', PipelineStage.PreProcess, inheritPlugin);
    compiler.use('state', PipelineStage.PreProcess, stateHydrationPlugin);
    compiler.use('attr-cache', PipelineStage.PreProcess, attributeCachePlugin);
    compiler.use('incremental', PipelineStage.ReStructure, incrementalDiscoveryPlugin);
    compiler.use('path', PipelineStage.ReStructure, pathResolutionPlugin);
    compiler.use('tree', PipelineStage.Hydrate, treeAssemblyPlugin);
    compiler.use('actions', PipelineStage.Hydrate, actionTagsPlugin);
    compiler.use('sync', PipelineStage.Hydrate, autoSyncPlugin);
    compiler.use('guard', PipelineStage.PostAssemble, recursionGuardPlugin);
  });

  describe('InheritPlugin', () => {
    it('should implement prototypal inheritance for props', () => {
      const entities = new Map([
        ['base', {id: 'base', type: 'div', props: {theme: 'dark', color: 'blue'}}],
        ['child', {id: 'child', inherit: 'base', props: {color: 'red'}}]
      ]);

      const result = compiler.compile(entities, {rootId: 'child'});
      const child = result[0];

      expect(child.props?.theme).toBe('dark');
      expect(child.props?.color).toBe('red');
    });
  });

  describe('AttributeCachePlugin', () => {
    it('should cache mustache resolution results', () => {
      const entities = new Map<string, any>([
        ['node', {id: 'node', type: 'text', props: {content: 'Hello {{user}}'}}]
      ]);

      const atomRegistry = jsompEnv.service!.globalRegistry;
      atomRegistry.set('user', new JsompAtom('Alice'));

      // First compile
      const result1 = compiler.compile(entities, {atomRegistry});
      expect(result1[0].props?.content).toBe('Hello Alice');

      // Update atom
      atomRegistry.set('user', new JsompAtom('Bob'));

      // Second compile (incremental)
      const result2 = compiler.compile(entities, {
        dirtyIds: new Set(['node']),
        atomRegistry
      });
      expect(result2[0].props?.content).toBe('Hello Bob');
    });
  });

  describe('IncrementalDiscoveryPlugin & Topology', () => {
    it('should handle topological shifts (moving nodes between parents)', () => {
      const entities = new Map<string, any>([
        ['root', {id: 'root', type: 'div'}],
        ['box1', {id: 'box1', type: 'div', parent: 'root'}],
        ['box2', {id: 'box2', type: 'div', parent: 'root'}],
        ['item', {id: 'item', type: 'span', parent: 'box1'}]
      ]);

      // 1. Initial compile
      compiler.compile(entities, {rootId: 'root'});
      const box1 = (compiler as any).nodes.get('box1');
      const box2 = (compiler as any).nodes.get('box2');

      expect(box1.children.length).toBe(1);
      expect(box2.children.length).toBe(0);

      // 2. Shift item to box2
      entities.set('item', {...entities.get('item'), parent: 'box2'});

      // Perform incremental compile
      compiler.compile(entities, {
        dirtyIds: new Set(['item']),
        rootId: 'root'
      });

      // Verification: box1 should be empty, box2 should have 1 child
      expect(box1.children.length).toBe(0);
      expect(box2.children.length).toBe(1);
      expect(box2.children[0].id).toBe('item');
    });

    it('should preserve node object references for non-dirty nodes', () => {
      const entities = new Map<string, any>([
        ['root', {id: 'root', type: 'div'}],
        ['static', {id: 'static', type: 'span', parent: 'root'}],
        ['dynamic', {id: 'dynamic', type: 'span', parent: 'root'}]
      ]);

      compiler.compile(entities);
      const staticNodeBefore = (compiler as any).nodes.get('static');

      // Only 'dynamic' changes
      entities.set('dynamic', {...entities.get('dynamic'), props: {updated: true}});
      compiler.compile(entities, {dirtyIds: new Set(['dynamic'])});

      const staticNodeAfter = (compiler as any).nodes.get('static');
      expect(staticNodeBefore).toBe(staticNodeAfter); // 💡 Identity stability check
    });
  });

  describe('RecursionGuardPlugin', () => {
    it('should truncate tree when max depth is exceeded', () => {
      // Create a chain of 35 nodes (MAX_DEPTH is 32)
      const entities = new Map<string, any>();
      entities.set('root', {id: 'root', type: 'div'});

      for (let i = 1; i <= 35; i++) {
        entities.set(`node${i}`, {
          id: `node${i}`,
          type: 'div',
          parent: i === 1 ? 'root' : `node${i - 1}`
        });
      }

      const result = compiler.compile(entities, {rootId: 'root'});

      // Navigate to the 32nd level
      let current: any = result[0];
      for (let i = 1; i < 32; i++) {
        current = current.children[0];
      }

      // The 32nd node's children should be empty (truncated)
      expect(current.children.length).toBe(0);
      expect(current.props?._error).toBe('RECURSION_DEPTH_EXCEEDED');
    });

    it('should throw error when detecting cycles', () => {
      const entities = new Map<string, any>([
        ['a', {id: 'a', type: 'div', parent: 'a'}]
      ]);
      // Pass 1: Ensure node 'a' exists in the logic store
      compiler.compile(entities);

      // Pass 2: Re-compile with dirty flag to trigger IncrementalDiscovery 
      // to link 'a' to itself (parent lookup finds 'a' in ctx.nodes), creating a cycle.
      expect(() => {
        compiler.compile(entities, {rootId: 'a', dirtyIds: new Set(['a'])});
      }).toThrow();
    });
  });


  describe('ActionTagsPlugin & AutoSync', () => {
    it('should resolve action tags to event listeners', () => {
      const actionRegistry = jsompEnv.service!.actions;
      const handler = vi.fn();
      actionRegistry.register('my-btn', (env) => handler(env.event));

      const entities = new Map<string, any>([
        ['btn', {id: 'btn', type: 'button', actions: {'my-btn': ['click']}}]
      ]);

      const result = compiler.compile(entities, {actionRegistry});
      const node = result[0] as any;

      expect(node.onEvent?.click).toBeDefined();
      node.onEvent.click();
      expect(handler).toHaveBeenCalled();
    });

    it('should setup auto-sync for controlled components', () => {
      const componentRegistry = jsompEnv.service!.componentRegistry;
      componentRegistry.register('Input', () => null, {
        sync: [{prop: 'value', event: 'onChange', extract: 'target.value', required: true}]
      });

      const atomRegistry = jsompEnv.service!.globalRegistry;
      atomRegistry.set('username', new JsompAtom('Alice'));

      const entities = new Map<string, any>([
        ['in', {id: 'in', type: 'Input', props: {value: '{{username}}'}}]
      ]);

      const result = compiler.compile(entities, {atomRegistry});
      const node = result[0] as any;

      expect(node.onEvent?.onChange).toBeDefined();

      // Simulate input change
      node.onEvent.onChange({target: {value: 'Bob'}});
      expect(atomRegistry.get('username')?.value).toBe('Bob');
    });
  });

  describe('StateHydrationPlugin', () => {
    it('should initialize atoms from State type entities', () => {
      const entities = new Map<string, any>([
        ['count', {id: 'count', type: 'State', props: {initial: 10}}]
      ]);

      const atomRegistry = jsompEnv.service!.globalRegistry;
      compiler.compile(entities, {atomRegistry});

      const atom = atomRegistry.get('count');
      expect(atom).toBeDefined();
      expect(atom?.value).toBe(10);
    });
  });
});
