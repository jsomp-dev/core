import React, {useState, useRef, useEffect} from 'react';
import {JsompStream} from "../src";
import {JsompPage} from "../src/renderer/react";

type StreamMode = 'char' | 'chunk';

/**
 * StreamTest - Advanced AI-to-UI Pipeline Laboratory
 * 
 * This component simulates high-pressure AI streaming outputs.
 * It strictly validates:
 * 1. IJsompNode compliance (id, type, parent, props, style_*)
 * 2. Real-world streaming variability (char-by-char vs chunked)
 * 3. JsompStream's ability to repair fragments on the fly
 */
export const StreamTest: React.FC = () => {
  const [entities, setEntities] = useState<any[]>([
    {
      id: 'stream_root',
      type: 'div',
      style_css: {
        padding: '2rem',
        background: '#18181b',
        borderRadius: '0.5rem',
        border: '1px solid #27272a',
        minHeight: '550px',
        width: '100%',
        display: 'flex',
        flexDirection: 'column'
      }
    },
    {
      id: 'header',
      type: 'h2',
      parent: 'stream_root',
      style_css: {marginBottom: '0.5rem', color: '#fafafa', fontSize: '1.25rem', fontWeight: '600', letterSpacing: '-0.025em'},
      props: {children: 'AI Pipeline: Live Reconstruction'}
    },
    {
      id: 'desc',
      type: 'p',
      parent: 'stream_root',
      style_css: {color: '#71717a', fontSize: '0.8125rem', marginBottom: '2.5rem', lineHeight: '1.6'},
      props: {children: 'Simulating non-deterministic AI token output. The engine must reconcile partial JSON into valid UI nodes.'}
    }
  ]);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamMode, setStreamMode] = useState<StreamMode>('chunk');
  const [logs, setLogs] = useState<{type: 'patch' | 'info', content: string}[]>([]);
  const [rawText, setRawText] = useState('');
  const logEndRef = useRef<HTMLDivElement>(null);
  const rawEndRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<any>(null);
  const [testKey, setTestKey] = useState(0);

  // Auto-scroll logic
  useEffect(() => {
    logEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [logs]);

  useEffect(() => {
    rawEndRef.current?.scrollIntoView({behavior: 'smooth'});
  }, [rawText]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startStream = () => {
    if (isStreaming) return;

    // KILL Residue from previous runs
    if (timerRef.current) clearInterval(timerRef.current);

    setIsStreaming(true);
    setLogs([{type: 'info', content: `Pipeline Resetting...`}]);
    setRawText('');
    setTestKey(prev => prev + 1); // FORCE Remount JsompPage to clear child states

    setLogs(prev => [...prev, {type: 'info', content: `Pipeline Initialized (Mode: ${streamMode.toUpperCase()})`}]);

    const baseEntities = [
      {id: 'stream_root', type: 'div', style_css: {padding: '2rem', background: '#18181b', borderRadius: '0.5rem', border: '1px solid #27272a', minHeight: '550px', height: '100%', display: 'flex', flexDirection: 'column'}},
      {id: 'header', type: 'h2', parent: 'stream_root', style_css: {marginBottom: '0.5rem', color: '#fafafa', fontSize: '1.25rem', fontWeight: '600', letterSpacing: '-0.025em'}, props: {children: 'AI Pipeline: Live Reconstruction'}},
      {id: 'desc', type: 'p', parent: 'stream_root', style_css: {color: '#71717a', fontSize: '0.8125rem', marginBottom: '2.5rem', lineHeight: '1.6'}, props: {children: 'Simulating non-deterministic AI token output. The engine must reconcile partial JSON into valid UI nodes.'}}
    ];
    setEntities(baseEntities);

    const stream = new JsompStream({
      onPatch: (patch) => {
        setLogs(prev => [...prev.slice(-100), {type: 'patch', content: `Reconciled: ${patch.id}`}]);
        setEntities(prev => {
          const index = prev.findIndex(e => e.id === patch.id);
          if (index !== -1) {
            const next = [...prev];
            next[index] = {...next[index], ...patch};
            return next;
          } else {
            return [...prev, patch];
          }
        });
      },
      onFinish: () => {
        setLogs(prev => [...prev, {type: 'info', content: '✓ Stream Buffer Flushed & Sealed'}]);
        setIsStreaming(false);
      }
    });

    // Rigorous mock data following IJsompNode
    const FULL_JSON = JSON.stringify({
      "sys_dashboard": {
        "id": "sys_dashboard",
        "type": "div",
        "parent": "stream_root",
        "style_tw": ["flex-1", "grid", "grid-cols-1", "md:grid-cols-2", "gap-6"]
      },
      "resource_card": {
        "id": "resource_card",
        "type": "div",
        "parent": "sys_dashboard",
        "style_presets": ["flat-panel"],
        "style_tw": ["p-6", "bg-zinc-900", "border", "border-zinc-800", "rounded-lg"],
        "actions": {"refresh": ["onClick"]}
      },
      "card_title": {
        "id": "card_title",
        "type": "h4",
        "parent": "resource_card",
        "props": {"children": "Node Performance"},
        "style_css": {"fontSize": "14px", "fontWeight": "600", "color": "#fafafa", "marginBottom": "1.5rem"}
      },
      "cpu_meter": {
        "id": "cpu_meter",
        "type": "div",
        "parent": "resource_card",
        "style_tw": ["space-y-2"]
      },
      "cpu_label_row": {
        "id": "cpu_label_row",
        "type": "div",
        "parent": "cpu_meter",
        "style_css": {"display": "flex", "justifyContent": "space-between", "fontSize": "11px", "color": "#71717a"}
      },
      "cpu_label": {
        "id": "cpu_label",
        "type": "span",
        "parent": "cpu_label_row",
        "props": {"children": "CPU usage CORE_0"}
      },
      "cpu_percent": {
        "id": "cpu_percent",
        "type": "span",
        "parent": "cpu_label_row",
        "props": {"children": "42%"}
      },
      "cpu_bar": {
        "id": "cpu_bar",
        "type": "div",
        "parent": "cpu_meter",
        "style_css": {"height": "6px", "background": "#27272a", "borderRadius": "3px", "overflow": "hidden"}
      },
      "cpu_fill": {
        "id": "cpu_fill",
        "type": "div",
        "parent": "cpu_bar",
        "style_css": {"height": "100%", "width": "42%", "background": "#10b981", "transition": "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"}
      },
      "action_box": {
        "id": "action_box",
        "type": "div",
        "parent": "sys_dashboard",
        "style_tw": ["p-6", "bg-zinc-900", "border", "border-zinc-800", "rounded-lg", "flex", "flex-col", "justify-center", "items-center", "gap-4"]
      },
      "status_badge": {
        "id": "status_badge",
        "type": "div",
        "parent": "action_box",
        "props": {"children": "Secure Tunnel Active"},
        "style_tw": ["px-3", "py-1", "bg-zinc-800", "text-zinc-400", "text-[10px]", "uppercase", "tracking-widest", "rounded-full", "border", "border-zinc-700/50"]
      },
      "action_btn": {
        "id": "action_btn",
        "type": "button",
        "parent": "action_box",
        "props": {"children": "Deploy Patch"},
        "style_tw": ["w-full", "py-2", "bg-zinc-50", "text-zinc-950", "rounded", "font-medium", "text-sm", "hover:bg-zinc-200", "transition-colors"]
      }
    }, null, 2);

    let cursor = 0;
    const intervalTime = streamMode === 'char' ? 10 : 80;

    timerRef.current = setInterval(() => {
      if (cursor < FULL_JSON.length) {
        let chunkSize = 1;
        if (streamMode === 'chunk') {
          // Faster chunks: 10-40 characters at a time
          chunkSize = Math.floor(Math.random() * 30) + 10;
        }

        const chunk = FULL_JSON.substring(cursor, cursor + chunkSize);
        setRawText(prev => prev + chunk);
        stream.write(chunk);
        cursor += chunkSize;
      } else {
        stream.end();
        clearInterval(timerRef.current);
      }
    }, intervalTime);
  };

  return (
    <div style={{padding: '20px', display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '1280px'}}>

      {/* Simulation Dashboard Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#18181b',
        padding: '1.25rem 2rem',
        borderRadius: '0.75rem',
        border: '1px solid #27272a',
        boxShadow: '0 8px 32px -8px rgba(0,0,0,0.5)'
      }}>
        <div style={{display: 'flex', gap: '2rem', alignItems: 'center'}}>
          <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
            <span style={{fontSize: '0.625rem', color: '#71717a', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Signal Path</span>
            <div style={{display: 'flex', gap: '0.75rem'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: streamMode === 'char' ? '#fafafa' : '#525252', fontSize: '0.8125rem', cursor: 'pointer', transition: 'color 0.2s'}}>
                <input type="radio" checked={streamMode === 'char'} onChange={() => setStreamMode('char')} disabled={isStreaming} />
                Char-by-Char
              </label>
              <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: streamMode === 'chunk' ? '#fafafa' : '#525252', fontSize: '0.8125rem', cursor: 'pointer', transition: 'color 0.2s'}}>
                <input type="radio" checked={streamMode === 'chunk'} onChange={() => setStreamMode('chunk')} disabled={isStreaming} />
                Fragment Chunks
              </label>
            </div>
          </div>

          <div style={{width: '2px', height: '24px', background: '#27272a'}} />

          <div style={{display: 'flex', flexDirection: 'column', gap: '0.25rem'}}>
            <span style={{fontSize: '0.625rem', color: '#71717a', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Pipe Status</span>
            <span style={{fontSize: '0.8125rem', color: isStreaming ? '#3b82f6' : '#525252', fontWeight: '500'}}>
              {isStreaming ? '• ACTIVE_STREAMING' : 'IDLE'}
            </span>
          </div>
        </div>

        <button
          onClick={startStream}
          disabled={isStreaming}
          style={{
            padding: '0.625rem 2rem',
            background: isStreaming ? '#27272a' : '#fafafa',
            color: isStreaming ? '#71717a' : '#09090b',
            border: 'none',
            borderRadius: '0.375rem',
            fontWeight: '600',
            cursor: isStreaming ? 'not-allowed' : 'pointer',
            fontSize: '0.75rem',
            letterSpacing: '0.05em',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {isStreaming ? 'INJECTING TOKENS...' : 'INITIATE PIPELINE'}
        </button>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 420px', gap: '1.5rem'}}>

        {/* LEFT: Rendered UI Result */}
        <section style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
          <div style={{display: 'flex', alignItems: 'baseline', gap: '0.5rem'}}>
            <h3 style={{color: '#fafafa', fontSize: '0.75rem', fontWeight: 'semibold'}}>Render Target</h3>
            <span style={{color: '#71717a', fontSize: '0.625rem', fontFamily: 'monospace'}}>IJsompNode v2.0 Compliance</span>
          </div>
          <div style={{
            flex: 1,
            background: '#09090b',
            borderRadius: '0.75rem',
            border: '1px solid #27272a',
            overflow: 'hidden',
            position: 'relative',
            minHeight: '600px',
            boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)'
          }}>
            <JsompPage key={testKey} entities={entities} rootId="stream_root" />
            {!isStreaming && logs.length === 0 && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#3f3f46', fontSize: '0.875rem', fontFamily: 'monospace'
              }}>
                [ STANDBY: WAITING FOR TOKEN SIGNAL ]
              </div>
            )}
          </div>
        </section>

        {/* RIGHT: Data Pipeline Visualization */}
        <aside style={{display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>

          {/* Incoming Raw Data */}
          <div style={{display: 'flex', flexDirection: 'column', height: '400px'}}>
            <h3 style={{color: '#71717a', fontSize: '0.625rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem'}}>Stage 1: Inbound Token Stream (Raw)</h3>
            <div style={{
              flex: 1,
              background: '#09090b',
              border: '1px solid #27272a',
              borderRadius: '0.5rem',
              padding: '1.25rem',
              fontSize: '0.75rem',
              color: '#38bdf8',
              fontFamily: '"Fira Code", monospace',
              overflowY: 'auto',
              lineHeight: '1.5',
              position: 'relative',
              whiteSpace: 'pre', // Changed to pre for better JSON look
              wordBreak: 'break-all',
              boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
            }}>
              {rawText}
              {isStreaming && <span style={{display: 'inline-block', width: '8px', height: '14px', background: '#38bdf8', marginLeft: '2px', animation: 'cursor-blink 0.8s infinite'}}></span>}
              <div ref={rawEndRef} />
            </div>
          </div>

          {/* Reconciler Logs */}
          <div style={{display: 'flex', flexDirection: 'column', flex: 1}}>
            <h3 style={{color: '#71717a', fontSize: '0.625rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem'}}>JsompReconciler Lifecycle</h3>
            <div style={{
              height: '340px',
              background: '#09090b',
              border: '1px solid #27272a',
              borderRadius: '0.5rem',
              padding: '1.25rem',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.625rem'
            }}>
              {logs.map((log, idx) => (
                <div key={idx} style={{
                  fontSize: '0.75rem',
                  color: log.type === 'info' ? '#10b981' : '#a1a1aa',
                  fontFamily: 'monospace',
                  padding: '6px 10px',
                  background: log.type === 'info' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(39, 39, 42, 0.15)',
                  borderRadius: '4px',
                  border: `1px solid ${log.type === 'info' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(39, 39, 42, 0.1)'}`
                }}>
                  <span style={{color: '#525252', marginRight: '8px'}}>[{new Date().toLocaleTimeString([], {hour12: false})}]</span>
                  {log.content}
                </div>
              ))}
              {logs.length === 0 && (
                <div style={{fontSize: '0.8125rem', color: '#27272a', textAlign: 'center', marginTop: '6rem', fontFamily: 'monospace'}}>PIPELINE_STANDBY</div>
              )}
              <div ref={logEndRef} />
            </div>
          </div>

        </aside>

      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        .animate-in { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}} />
    </div>
  );
};
