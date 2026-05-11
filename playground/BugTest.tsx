import React, {useState, useEffect, useRef, useCallback} from 'react';
import {jsompEnv, BasicRegistry} from "@jsomp/core";
import {JsompView} from "@jsomp/core/react";

type BugTab = 'registry-fallback';

const tabs: {id: BugTab; label: string; desc: string}[] = [
  {id: 'registry-fallback', label: 'Registry Fallback', desc: 'setRegistryFallback duplicate subscription detection'}
];

export const BugTest: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<BugTab>('registry-fallback');
  const [log, setLog] = useState<string[]>([]);
  const [duplicateDetected, setDuplicateDetected] = useState(false);
  const [lastBatch, setLastBatch] = useState(0);
  const fireCountRef = useRef(0);
  const batchRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const regRef = useRef<any>(null);
  const suppressRef = useRef(false);

  const addLog = useCallback((msg: string) => {
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 20));
  }, []);

  useEffect(() => {
    const init = async () => {
      const jsomp = jsompEnv.service;
      BasicRegistry.registerAll(jsomp.components);

      const reg = jsomp.atoms;
      regRef.current = reg;
      reg.set('totalFires', 0);
      reg.set('toggleFlag', false);
      reg.set('lastFireBatch', 0);
      reg.set('dupStatus', 'none');

      const unsub = reg.subscribeAll((key: string) => {
        if (key === 'toggleFlag' && !suppressRef.current) {
          fireCountRef.current += 1;
          batchRef.current += 1;
          reg.set('totalFires', fireCountRef.current);

          clearTimeout(timerRef.current);
          const currentBatch = batchRef.current;
          timerRef.current = setTimeout(() => {
            const isDup = batchRef.current > 1;
            setDuplicateDetected(isDup);
            setLastBatch(batchRef.current);
            reg.set('lastFireBatch', batchRef.current);
            reg.set('dupStatus', isDup ? 'dup' : 'ok');
            if (isDup) {
              addLog(`DUPLICATE: listener fired ${batchRef.current}x for single toggle`);
            } else {
              addLog(`OK: listener fired 1x for single toggle`);
            }
            batchRef.current = 0;
          }, 100);
        }
      });

      setIsReady(true);
      addLog('BugTest initialized');
      return unsub;
    };
    const unsubPromise = init();
    return () => { unsubPromise.then(unsub => unsub?.()); };
  }, [addLog]);

  const toggleAtom = useCallback(() => {
    const reg = regRef.current;
    if (!reg) return;
    const current = reg.get('toggleFlag');
    reg.set('toggleFlag', !current);
  }, []);

  const resetAll = useCallback(() => {
    fireCountRef.current = 0;
    batchRef.current = 0;
    setLastBatch(0);
    setDuplicateDetected(false);
    const reg = regRef.current;
    if (reg) {
      suppressRef.current = true;
      reg.set('totalFires', 0);
      reg.set('toggleFlag', false);
      reg.set('lastFireBatch', 0);
      reg.set('dupStatus', 'none');
      suppressRef.current = false;
    }
    addLog('Counters reset');
  }, [addLog]);

  const entities = [
    {
      id: 'bug_panel',
      type: 'Box',
      style_tw: ['p-8', 'bg-zinc-900/90', 'backdrop-blur-xl', 'border', 'border-zinc-800', 'rounded-3xl', 'shadow-2xl', 'max-w-2xl', 'w-full'],
    },
    {
      id: 'bug_title',
      type: 'Text',
      parent: 'bug_panel',
      props: {children: 'Registry Fallback Bug Test', as: 'h1'},
      style_tw: ['text-2xl', 'font-black', 'text-white', 'tracking-tighter', 'mb-2']
    },
    {
      id: 'bug_desc',
      type: 'Text',
      parent: 'bug_panel',
      props: {children: 'Tests whether setRegistryFallback registers duplicate subscribeAll listeners. Uses reg.set() directly to ensure AtomRegistry notifications fire correctly.'},
      style_tw: ['text-xs', 'text-zinc-400', 'mb-6', 'leading-relaxed']
    },
    {
      id: 'stats_grid',
      type: 'Box',
      parent: 'bug_panel',
      style_tw: ['grid', 'grid-cols-3', 'gap-4', 'mb-6'],
    },
    {
      id: 'stat_total',
      type: 'Box',
      parent: 'stats_grid',
      style_tw: ['p-4', 'rounded-xl', 'border', 'border-zinc-800', 'bg-black/40'],
    },
    {
      id: 'stat_total_label',
      type: 'Text',
      parent: 'stat_total',
      props: {children: 'Total Fires'},
      style_tw: ['text-[10px]', 'text-zinc-500', 'font-bold', 'uppercase', 'mb-1']
    },
    {
      id: 'stat_total_val',
      type: 'Text',
      parent: 'stat_total',
      props: {children: '{{totalFires}}'},
      style_tw: ['text-2xl', 'font-black', 'text-emerald-400']
    },
    {
      id: 'stat_batch',
      type: 'Box',
      parent: 'stats_grid',
      style_tw: ['p-4', 'rounded-xl', 'border', 'border-zinc-800', 'bg-black/40'],
    },
    {
      id: 'stat_batch_label',
      type: 'Text',
      parent: 'stat_batch',
      props: {children: 'Last Batch'},
      style_tw: ['text-[10px]', 'text-zinc-500', 'font-bold', 'uppercase', 'mb-1']
    },
    {
      id: 'stat_batch_val',
      type: 'Text',
      parent: 'stat_batch',
      props: {children: '{{lastFireBatch}}'},
      style_tw: ['text-2xl', 'font-black', 'text-sky-400']
    },
    {
      id: 'stat_status',
      type: 'Box',
      parent: 'stats_grid',
      style_tw: ['p-4', 'rounded-xl', 'border', 'border-zinc-800', 'bg-black/40'],
    },
    {
      id: 'stat_status_label',
      type: 'Text',
      parent: 'stat_status',
      props: {children: 'Listener Status'},
      style_tw: ['text-[10px]', 'text-zinc-500', 'font-bold', 'uppercase', 'mb-1']
    },
    {
      id: 'stat_status_val',
      type: 'Text',
      parent: 'stat_status',
      props: {children: '{{dupStatus}}'},
      style_tw: ['text-lg', 'font-black'],
      style_css: {
        color: {
          opType: 'if',
          target: '{{dupStatus}}',
          then: '#ef4444',
          else: '#22c55e'
        }
      }
    },
  ];

  return (
    <div className="w-full h-full flex items-start justify-center p-4 pt-8">
      {!isReady ? (
        <div className="text-zinc-500 text-sm">Initializing...</div>
      ) : (
        <div className="w-full max-w-2xl space-y-4">
          <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800 w-fit">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-zinc-700 text-white shadow-lg'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 mb-2">
            <div className={`px-3 py-1 rounded-full text-xs font-bold ${
              duplicateDetected
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }`}>
              {duplicateDetected ? '⚠ Duplicate Detected' : '✓ Single Fire per Toggle'}
            </div>
            <div className="text-zinc-600 text-xs">
              Batch: {lastBatch > 0 ? `${lastBatch}x` : '—'}
            </div>
            <button
              onClick={resetAll}
              className="ml-auto px-3 py-1 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-all"
            >
              Reset
            </button>
          </div>

          <JsompView entities={entities} id="bug_test" />

          <div className="flex gap-3">
            <button
              onClick={toggleAtom}
              className="flex-1 py-4 rounded-xl font-bold cursor-pointer active:scale-95 transition-all duration-500 border border-white/10 text-white"
              style={{backgroundColor: '#3b82f6'}}
            >
              Toggle Atom (via reg.set)
            </button>
          </div>

          <div className="p-4 bg-zinc-900/80 rounded-2xl border border-zinc-800 h-40 overflow-y-auto">
            {log.length === 0 ? (
              <div className="text-zinc-600 text-xs font-mono">No events yet. Click "Toggle Atom" to start.</div>
            ) : (
              log.map((entry, i) => (
                <div key={i} className={`text-xs font-mono mb-1 ${
                  entry.includes('DUPLICATE') ? 'text-red-400' : 'text-zinc-500'
                }`}>
                  {entry}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};