import {describe, it, expect, beforeAll} from 'vitest';
import {IJsompCompiler, setupJsomp} from '../../../src';

describe('WindowPlugin Logic', () => {
  let compiler: IJsompCompiler;

  beforeAll(async () => {
    // 确保环境初始化以加载标准插件
    await setupJsomp({framework: 'fallback'});
  });

  it('should identify window type nodes and mark them as system nodes', async () => {
    // 使用默认配置的 compiler
    compiler = (await setupJsomp()).createCompiler();

    const entities = new Map<string, any>([
      ['win_node', {
        id: 'win_node',
        type: 'window',
        props: { title: 'Test Window' }
      }]
    ]);

    const {nodes} = compiler.compile(entities, { rootId: 'win_node' });
    
    const node = nodes.get('win_node') as any;
    expect(node).toBeDefined();
    expect(node.type).toBe('window');
    // 验证插件特有的标识（WindowPlugin 在 Hydrate 阶段注入）
    expect(node._isSystemNode).toBe(true);
  });

  it('should resolve standard hierarchy for window nodes', async () => {
    compiler = (await setupJsomp()).createCompiler();

    const entities = new Map<string, any>([
      ['parent', { type: 'div' }],
      ['child_win', { type: 'window', parent: 'parent' }]
    ]);

    const {nodes} = compiler.compile(entities);
    const node = nodes.get('child_win');
    // 验证基础关系依然被 ReStructure 阶段正常解析
    expect(node?.parent).toBe('parent');
  });
});
