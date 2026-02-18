import React, {useMemo, useState} from 'react';
import {jsompEnv, JsompPage, PipelineStage} from "../src";

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
        padding: '2rem',
        background: '#0f172a',
        borderRadius: '1rem',
        color: 'white',
        border: '1px solid #1e293b'
      }
    },
    {
      id: 'header',
      type: 'h2',
      parent: 'perf_root',
      props: {children: '🚀 Performance & Jank Monitor Lab'}
    },
    {
      id: 'desc',
      type: 'p',
      parent: 'perf_root',
      style_css: {color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem'},
      props: {children: 'This lab verifies that our Jank detection still works for real data updates while ignoring pure React re-renders.'}
    },
    {
      id: 'stat_card',
      type: 'div',
      parent: 'perf_root',
      style_tw: ['p-4', 'bg-slate-800', 'rounded-lg', 'border', 'border-slate-700', 'mb-6'],
    },
    {
      id: 'stat_text',
      type: 'div',
      parent: 'stat_card',
      props: {children: 'Status: {{status}} | Updates: {{taskCount}}'}
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
      style_tw: ['px-4', 'py-2', 'bg-emerald-600', 'rounded', 'text-sm'],
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
      style_tw: ['px-4', 'py-2', 'bg-rose-600', 'rounded', 'text-sm'],
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
          background: '#1e293b',
          borderRadius: '1rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h4 style={{margin: '0 0 1rem 0', color: '#60a5fa', fontSize: '0.8rem', fontWeight: 'bold'}}>PURE REACT STATE</h4>
          <p style={{fontSize: '0.75rem', color: '#94a3b8', marginBottom: '1rem'}}>
            Clicking this button causes a React re-render BUT NO JSOMP version change.
          </p>
          <button
            onClick={() => setCount(c => c + 1)}
            style={{width: '100%', padding: '0.5rem', background: '#334155', border: 'none', borderRadius: '4px', color: 'white', cursor: 'pointer'}}
          >
            React Render: {count}
          </button>

          <div style={{marginTop: '1.5rem', fontSize: '0.7rem', color: '#10b981'}}>
            <strong>Expectation:</strong> Silent in Console
          </div>
        </div>
      </div>
    </div>
  );
};
