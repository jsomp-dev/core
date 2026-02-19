import React, {useMemo, useState} from 'react';
import {jsompEnv, PipelineStage} from "../src";
import {JsompPage} from "../src/renderer/react";

export const PerformanceTest: React.FC = () => {
  const [count, setCount] = useState(0);

  // 1. Prepare registry
  const registry = useMemo(() => {
    const reg = jsompEnv.service.createScope();
    reg.set('status', {value: 'System Ready'});
    reg.set('taskCount', {value: 0});
    return reg;
  }, []);

  // 2. Define entities (Memoized to prevent unnecessary JSOMP updates during React re-renders)
  const entities = useMemo(() => [
    {
      id: 'perf_root',
      type: 'div',
      style_css: {
        padding: '2.5rem',
        background: '#18181b',
        borderRadius: '0.5rem',
        color: '#fafafa',
        border: '1px solid #27272a'
      }
    },
    {
      id: 'header',
      type: 'h2',
      parent: 'perf_root',
      style_css: {marginBottom: '0.5rem', fontSize: '1.25rem', fontWeight: '600', letterSpacing: '-0.025em'},
      props: {children: 'Performance & Jank Monitor'}
    },
    {
      id: 'desc',
      type: 'p',
      parent: 'perf_root',
      style_css: {color: '#a1a1aa', fontSize: '0.8125rem', marginBottom: '1.5rem', lineHeight: '1.6'},
      props: {children: 'This lab verifies that our Jank detection still works for real data updates while ignoring pure React re-renders.'}
    },
    {
      id: 'stat_card',
      type: 'div',
      parent: 'perf_root',
      style_tw: ['p-3', 'bg-zinc-950', 'rounded', 'border', 'border-zinc-800', 'mb-6'],
    },
    {
      id: 'stat_text',
      type: 'div',
      parent: 'stat_card',
      style_css: {fontSize: '0.75rem', color: '#a1a1aa', fontFamily: 'monospace'},
      props: {children: 'STATUS: {{status}} | UPDATES: {{taskCount}}'}
    },
    {
      id: 'btn_group',
      type: 'div',
      parent: 'perf_root',
      style_css: {display: 'flex', gap: '1rem'}
    },
    {
      id: 'btn_normal',
      type: 'button',
      parent: 'btn_group',
      style_tw: ['px-4', 'py-1.5', 'bg-zinc-50', 'hover:bg-zinc-200', 'text-zinc-950', 'rounded', 'text-xs', 'font-medium', 'transition-colors'],
      props: {
        children: 'Normal Update (Fast)',
        onClick: () => {
          // Clear any malicious logic manually (hacky way for test)
          (jsompEnv.service.compiler as any).localRegistry.unregister?.('malicious_lag');

          registry.set('status', {value: 'Fast Click'});
          const currentCount = (registry.get('taskCount') as any)?.value || 0;
          registry.set('taskCount', {value: currentCount + 1});
        }
      }
    },
    {
      id: 'btn_slow',
      type: 'button',
      parent: 'btn_group',
      style_tw: ['px-4', 'py-1.5', 'bg-rose-600', 'hover:bg-rose-500', 'text-white', 'rounded', 'text-xs', 'font-medium', 'transition-colors'],
      props: {
        children: 'Trigger Jank (Slow)',
        onClick: () => {
          const randomLag = Math.floor(Math.random() * 40) + 40; // 40ms ~ 80ms

          jsompEnv.service.compiler.use('malicious_lag', PipelineStage.PreProcess, () => {
            const start = performance.now();
            while (performance.now() - start < randomLag) {
              // Forced blocking
            }
            return undefined;
          }, 'LagGenerator');

          registry.set('status', {value: `⚠️ Lag: ${randomLag}ms ⚠️`});
          const currentCount = (registry.get('taskCount') as any)?.value || 0;
          registry.set('taskCount', {value: currentCount + 1});
        }
      }
    }
  ], [registry]);

  return (
    <div style={{padding: '20px', width: '100%', maxWidth: '800px'}}>
      <div style={{display: 'flex', gap: '2rem', alignItems: 'start'}}>
        {/* Left: JSOMP Rendered Section */}
        <div style={{flex: 1}}>
          <JsompPage
            entities={entities}
            rootId="perf_root"
            scope={registry}
          />
        </div>

        {/* Right: Pure React Section (Unrelated to JSOMP Data) */}
        <div style={{
          width: '240px',
          padding: '1.5rem',
          background: '#18181b',
          borderRadius: '0.5rem',
          border: '1px solid #27272a'
        }}>
          <h4 style={{margin: '0 0 1rem 0', color: '#71717a', fontSize: '0.625rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em'}}>PURE REACT STATE</h4>
          <p style={{fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '1rem', lineHeight: '1.5'}}>
            Clicking this button causes a React re-render BUT NO JSOMP version change.
          </p>
          <button
            onClick={() => setCount(c => c + 1)}
            style={{width: '100%', padding: '0.5rem', background: '#27272a', border: 'none', borderRadius: '4px', color: '#fafafa', cursor: 'pointer', fontSize: '0.75rem'}}
          >
            React Render: {count}
          </button>

          <div style={{marginTop: '1.5rem', fontSize: '0.625rem', color: '#10b981', fontFamily: 'monospace'}}>
            <strong>EXPECTATION:</strong> SILENT IN CONSOLE
          </div>
        </div>
      </div>
    </div>
  );
};
