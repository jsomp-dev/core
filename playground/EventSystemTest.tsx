import React, {useState, useEffect, useCallback, useRef} from 'react';
import {jsompEnv, HtmlRegistry, EventPhase} from '../src';
import {JsompView} from '@jsomp/core/react';

const btn = 'px-3 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 border cursor-pointer';
const btnPrimary = `${btn} bg-sky-600/20 text-sky-300 border-sky-700/50 hover:bg-sky-600/30 active:bg-sky-600/40`;
const btnAmber = `${btn} bg-amber-600/20 text-amber-300 border-amber-700/50 hover:bg-amber-600/30 active:bg-amber-600/40`;
const btnEmerald = `${btn} bg-emerald-600/20 text-emerald-300 border-emerald-700/50 hover:bg-emerald-600/30 active:bg-emerald-600/40`;
const btnRose = `${btn} bg-rose-600/20 text-rose-300 border-rose-700/50 hover:bg-rose-600/30 active:bg-rose-600/40`;
const btnViolet = `${btn} bg-violet-600/20 text-violet-300 border-violet-700/50 hover:bg-violet-600/30 active:bg-violet-600/40`;
const card = 'p-4 bg-zinc-900/80 rounded-xl border border-zinc-800/60 space-y-2.5';
const label = 'text-[10px] font-semibold uppercase tracking-[0.15em]';
const value = 'text-xs text-zinc-300 font-mono';
const expect = 'text-[10px] text-zinc-600 leading-relaxed';

export const EventSystemTest: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [eventNames, setEventNames] = useState<string[]>([]);
  const [basicMsg, setBasicMsg] = useState('');
  const [phaseMsg, setPhaseMsg] = useState('');
  const [lifecycleMsg, setLifecycleMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [instanceMsg, setInstanceMsg] = useState('');
  const [originMsg, setOriginMsg] = useState('');
  const [countResult, setCountResult] = useState('');
  const [clearResult, setClearResult] = useState('');
  const [multiResult, setMultiResult] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 40));
  }, []);

  const sig = useRef<Record<string, any>>({});
  const unsubs = useRef<(() => void)[]>([]);

  useEffect(() => {
    const jsomp = jsompEnv.service!;
    HtmlRegistry.registerAll(jsomp.components);

    const names = ['demo:basic', 'demo:phase', 'demo:lifecycle', 'demo:error', 'demo:multi'];
    names.forEach(n => {
      jsomp.eventSignals.register(n);
      sig.current[n] = jsomp.eventSignals.getSignal(n);
    });

    setEventNames(jsomp.eventSignals.getNames());
    addLog(`Registered ${names.length} custom events`);
  }, [addLog]);

  // ========== 1. Basic Subscribe & Emit ==========
  const handleBasicSubscribe = () => {
    const s = sig.current['demo:basic'];
    if (!s) return;
    const unsub = s.subscribe((e: any) => {
      setBasicMsg(`Received: ${e.text}`);
      addLog(`[Basic] ${e.text}`);
    });
    unsubs.current.push(unsub);
    addLog('[Basic] Subscribed to demo:basic');
  };

  const handleBasicEmit = () => {
    const s = sig.current['demo:basic'];
    if (!s) return;
    s.emit({text: 'Hello from basic event!'});
    addLog('[Basic] Event emitted');
  };

  // ========== 2. Event Phases ==========
  const handlePhaseSubscribe = () => {
    const s = sig.current['demo:phase'];
    if (!s) return;

    const w = s.subscribe((e: any) => {
      setPhaseMsg(`WillCommit: ${e.text}`);
      addLog(`[Phase:WillCommit] ${e.text}`);
      e.defaultPrevented = true;
    }, {targetPhase: EventPhase.WillCommit});

    const f = s.subscribe((e: any) => {
      setPhaseMsg(`Finished: ${e.text}`);
      addLog(`[Phase:Finished] ${e.text}`);
    }, {targetPhase: EventPhase.Finished});

    const a = s.subscribe((e: any) => {
      setPhaseMsg(`Aborted: ${e.text}`);
      addLog(`[Phase:Aborted] ${e.text}`);
    }, {targetPhase: EventPhase.Aborted});

    unsubs.current.push(w, f, a);
    addLog('[Phase] Subscribed to WillCommit / Finished / Aborted');
  };

  const handlePhaseEmitWill = () => {
    const s = sig.current['demo:phase'];
    if (!s) return;
    s.emit({text: 'Phase test - will be blocked'}, EventPhase.WillCommit);
    addLog('[Phase] Emitted WillCommit (will be blocked)');
  };

  const handlePhaseEmitFinished = () => {
    const s = sig.current['demo:phase'];
    if (!s) return;
    s.emit({text: 'Phase test - completed normally'}, EventPhase.Finished);
    addLog('[Phase] Emitted Finished');
  };

  // ========== 3. Lifecycle ==========
  const handleLifecycle = async () => {
    const s = sig.current['demo:lifecycle'];
    if (!s) return;

    const w = s.subscribe((e: any) => {
      setLifecycleMsg(`WillCommit: ${e.text}`);
      addLog(`[Lifecycle:WillCommit] ${e.text}`);
    }, {targetPhase: EventPhase.WillCommit});

    const f = s.subscribe((e: any) => {
      setLifecycleMsg(`Finished: ${e.text}`);
      addLog(`[Lifecycle:Finished] ${e.text}`);
    }, {targetPhase: EventPhase.Finished});

    await s.emitLifecycle({text: 'Full lifecycle test'}, () => {
      addLog('[Lifecycle] onCommit executing...');
    });

    unsubs.current.push(w, f);
    addLog('[Lifecycle] Lifecycle completed');
  };

  const handleLifecycleAborted = async () => {
    const s = sig.current['demo:lifecycle'];
    if (!s) return;

    const w = s.subscribe((e: any) => {
      setLifecycleMsg(`WillCommit: ${e.text} → blocked`);
      addLog(`[Lifecycle:WillCommit] ${e.text} → blocked`);
      e.defaultPrevented = true;
    }, {targetPhase: EventPhase.WillCommit});

    const a = s.subscribe((e: any) => {
      setLifecycleMsg(`Aborted: ${e.text}`);
      addLog(`[Lifecycle:Aborted] ${e.text}`);
    }, {targetPhase: EventPhase.Aborted});

    await s.emitLifecycle({text: 'Lifecycle to be blocked'}, () => {
      addLog('[Lifecycle] onCommit should not execute');
    });

    unsubs.current.push(w, a);
    addLog('[Lifecycle] Lifecycle blocked');
  };

  // ========== 4. Error Phase ==========
  const handleErrorTest = async () => {
    const s = sig.current['demo:error'];
    if (!s) return;

    const eSub = s.subscribe((ev: any) => {
      setErrorMsg(`Error: ${ev.error?.message}`);
      addLog(`[Error] Caught error: ${ev.error?.message}`);
    }, {targetPhase: EventPhase.Error});

    const wSub = s.subscribe(() => {
      throw new Error('Simulated handler exception');
    }, {targetPhase: EventPhase.WillCommit});

    await s.emitLifecycle({text: 'Trigger error'});

    unsubs.current.push(eSub, wSub);
    addLog('[Error] Error phase test completed');
  };

  // ========== 5. Instance Ready ==========
  const handleInstanceReady = () => {
    const jsomp = jsompEnv.service!;
    const s = jsomp.eventSignals.getSignal('jsomp:instanceReady')!;

    const w = s.subscribe((ev) => {
      setInstanceMsg(`WillCommit: id=${ev.id}`);
      addLog(`[InstanceReady:WillCommit] id=${ev.id}`);
    }, {targetPhase: EventPhase.WillCommit});

    const f = s.subscribe((ev) => {
      setInstanceMsg(`Finished: id=${ev.id}, path=${ev.path || '-'}`);
      addLog(`[InstanceReady:Finished] id=${ev.id}, path=${ev.path || '-'}`);
    }, {targetPhase: EventPhase.Finished});

    const a = s.subscribe((ev) => {
      setInstanceMsg(`Aborted: id=${ev.id}`);
      addLog(`[InstanceReady:Aborted] id=${ev.id}`);
    }, {targetPhase: EventPhase.Aborted});

    const e = s.subscribe((ev) => {
      setInstanceMsg(`Error: ${ev.error?.message}`);
      addLog(`[InstanceReady:Error] ${ev.error?.message}`);
    }, {targetPhase: EventPhase.Error});

    unsubs.current.push(w, f, a, e);

    s.emit({id: 'btn-demo', instance: {type: 'button'}, path: 'root.form.btn-demo'}, EventPhase.WillCommit);
    s.emit({id: 'btn-demo', instance: {type: 'button'}, path: 'root.form.btn-demo'}, EventPhase.Finished);
    addLog('[InstanceReady] Emitted WillCommit → Finished');
  };

  const handleInstanceReadyAborted = () => {
    const jsomp = jsompEnv.service!;
    const s = jsomp.eventSignals.getSignal('jsomp:instanceReady')!;
    s.emit({id: 'btn-demo', instance: null, path: 'root.form.btn-demo'}, EventPhase.WillCommit);
    s.emit({id: 'btn-demo', instance: null, path: 'root.form.btn-demo'}, EventPhase.Aborted);
    addLog('[InstanceReady] Emitted WillCommit → Aborted');
  };

  const handleInstanceReadyError = () => {
    const jsomp = jsompEnv.service!;
    const s = jsomp.eventSignals.getSignal('jsomp:instanceReady')!;
    s.emit({id: 'btn-demo', instance: {type: 'button'}, path: 'root.form.btn-demo'}, EventPhase.WillCommit);
    s.emit({id: 'btn-demo', instance: {type: 'button'}, path: 'root.form.btn-demo', error: new Error('Simulated instance registration failure')}, EventPhase.Error);
    addLog('[InstanceReady] Emitted WillCommit → Error');
  };

  // ========== 6. returnOriginCallback ==========
  const handleOriginTest = () => {
    const jsomp = jsompEnv.service!;
    const s = jsomp.eventSignals.register<{msg: string}>('demo:origin');
    const handler = (e: {msg: string}) => {
      setOriginMsg(`Received: ${e.msg}`);
      addLog(`[Origin] ${e.msg}`);
    };
    const result = s.subscribe(handler, {returnOriginCallback: true as any});
    setOriginMsg(`Returns original function: ${result === handler}`);
    addLog(`[Origin] returnOriginCallback returns original: ${result === handler}`);

    setTimeout(() => (s as any).emit({msg: 'returnOrigin test passed'}), 300);
  };

  // ========== 7. listenerCount ==========
  const handleCountTest = () => {
    const s = sig.current['demo:basic'];
    if (!s) return;
    const total = s.listenerCount();
    const finished = s.listenerCount(EventPhase.Finished);
    setCountResult(`Total: ${total}, Finished: ${finished}`);
    addLog(`[Count] listenerCount total=${total}, Finished=${finished}`);
  };

  // ========== 8. Clear ==========
  const handleClearTest = () => {
    const s = sig.current['demo:basic'];
    if (!s) return;
    s.clear(EventPhase.Finished);
    setClearResult('Cleared Finished phase subscribers');
    addLog('[Clear] Cleared Finished phase subscribers');
  };

  // ========== 9. Multiple Subscribers ==========
  const handleMultiTest = () => {
    const s = sig.current['demo:multi'];
    if (!s) return;
    setMultiResult([]);

    const subs = [1, 2, 3].map(i => {
      return s.subscribe((e: any) => {
        const msg = `Subscriber #${i}: ${e.text}`;
        setMultiResult(prev => [...prev, msg]);
        addLog(`[Multi] ${msg}`);
      });
    });

    unsubs.current.push(...subs);
    s.emit({text: 'Multi-subscriber test'});
    addLog('[Multi] 3 subscribers triggered');
  };

  // ========== 10. Unsubscribe ==========
  const handleUnsubAll = () => {
    unsubs.current.forEach(fn => fn());
    unsubs.current = [];
    addLog('[Unsub] All subscriptions cancelled');
  };

  // ========== 11. Event Registry API ==========
  const handleRegistryCheck = () => {
    const jsomp = jsompEnv.service!;
    const names = jsomp.eventSignals.getNames();
    const hasBasic = jsomp.eventSignals.getSignal('demo:basic') !== undefined;
    addLog(`[Registry] Registered events: ${names.join(', ')}`);
    addLog(`[Registry] has('demo:basic'): ${hasBasic}`);
  };

  const entities = [
    {id: 'root', type: 'div', style_tw: ['w-full', 'max-w-5xl', 'mx-auto', 'flex', 'flex-col', 'gap-4']},
    {id: 'header', parent: 'root', type: 'div', style_tw: ['flex', 'items-end', 'justify-between', 'mb-2']},
    {id: 'title', parent: 'header', type: 'h1', style_tw: ['text-3xl', 'font-bold', 'text-zinc-100', 'tracking-tight'], props: {children: 'Event System Lab'}},
    {id: 'framework', parent: 'header', type: 'span', style_tw: ['px-2.5', 'py-1', 'bg-zinc-800', 'rounded-md', 'text-[11px]', 'font-medium', 'text-zinc-500', 'border', 'border-zinc-700/50'], props: {children: `Framework: ${jsompEnv.service?.frameworks.getActive()?.target ?? 'None'}`}},
    {id: 'desc', parent: 'root', type: 'p', style_tw: ['text-sm', 'text-zinc-500', 'mb-1'], props: {children: 'Interactive tests covering EventSignal, phases, lifecycle, registry & advanced APIs.'}},
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 py-10 px-6">
      <JsompView beforeMount={() => HtmlRegistry.registerAll(jsompEnv.service!.components)} entities={entities} rootId="root" id="event-lab" />

      <div className="max-w-5xl mx-auto mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 1. Basic Subscribe & Emit */}
        <div className={card}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span className={`${label} text-sky-400`}>Subscribe & Emit</span>
          </div>
          <p className="text-[11px] text-zinc-500">Subscribe to events and receive in Finished phase</p>
          <p className={expect}>Expected: Click "Subscribe" then "Emit", card shows received message, log shows <span className="text-zinc-400">[Basic]</span> entries</p>
          <div className="flex gap-2">
            <button className={btnPrimary} onClick={handleBasicSubscribe}>Subscribe</button>
            <button className={btnPrimary} onClick={handleBasicEmit}>Emit</button>
          </div>
          {basicMsg && <p className={value}>{basicMsg}</p>}
        </div>

        {/* 2. Event Phases */}
        <div className={card}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className={`${label} text-amber-400`}>Event Phases</span>
          </div>
          <p className="text-[11px] text-zinc-500">WillCommit → Aborted / Finished</p>
          <p className={expect}>Expected: Subscribe first, then click each emit button.<br/>WillCommit is blocked by <span className="text-zinc-400">defaultPrevented</span>, triggers Aborted; Finished emits normally</p>
          <div className="flex flex-wrap gap-2">
            <button className={btnAmber} onClick={handlePhaseSubscribe}>Subscribe</button>
            <button className={btnAmber} onClick={handlePhaseEmitWill}>WillCommit</button>
            <button className={btnAmber} onClick={handlePhaseEmitFinished}>Finished</button>
          </div>
          {phaseMsg && <p className={value}>{phaseMsg}</p>}
        </div>

        {/* 3. Lifecycle */}
        <div className={card}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className={`${label} text-emerald-400`}>Lifecycle</span>
          </div>
          <p className="text-[11px] text-zinc-500">emitLifecycle full flow</p>
          <p className={expect}>Expected: "Normal" triggers WillCommit → onCommit → Finished; "Blocked" prevents at WillCommit, jumps to Aborted, onCommit not called</p>
          <div className="flex flex-wrap gap-2">
            <button className={btnEmerald} onClick={handleLifecycle}>Normal</button>
            <button className={btnEmerald} onClick={handleLifecycleAborted}>Blocked</button>
          </div>
          {lifecycleMsg && <p className={value}>{lifecycleMsg}</p>}
        </div>

        {/* 4. Error Phase */}
        <div className={card}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span className={`${label} text-rose-400`}>Error Phase</span>
          </div>
          <p className="text-[11px] text-zinc-500">Handler exception → Error phase</p>
          <p className={expect}>Expected: WillCommit handler throws, event flows to Error phase, card shows error message, log shows <span className="text-zinc-400">[Error]</span> entries</p>
          <button className={btnRose} onClick={handleErrorTest}>Trigger Error</button>
          {errorMsg && <p className={value}>{errorMsg}</p>}
        </div>

        {/* 5. Instance Ready */}
        <div className={card}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            <span className={`${label} text-violet-400`}>Instance Ready</span>
          </div>
          <p className="text-[11px] text-zinc-500">Built-in instanceReady event</p>
          <p className={expect}>Expected: Subscribes to 4 phases and manually emits each.<br/>"Normal" triggers WillCommit → Finished; "Blocked" triggers WillCommit → Aborted; "Error" triggers WillCommit → Error</p>
          <div className="flex flex-wrap gap-2">
            <button className={btnViolet} onClick={handleInstanceReady}>Normal</button>
            <button className={btnViolet} onClick={handleInstanceReadyAborted}>Blocked</button>
            <button className={btnViolet} onClick={handleInstanceReadyError}>Error</button>
          </div>
          {instanceMsg && <p className={value}>{instanceMsg}</p>}
        </div>

        {/* 6. returnOriginCallback */}
        <div className={card}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            <span className={`${label} text-sky-400`}>Return Origin</span>
          </div>
          <p className="text-[11px] text-zinc-500">subscribe returns original function</p>
          <p className={expect}>Expected: Card shows "Returns original function: true", auto-receives event after 300ms, log shows <span className="text-zinc-400">[Origin]</span> entries</p>
          <button className={btnPrimary} onClick={handleOriginTest}>Test</button>
          {originMsg && <p className={value}>{originMsg}</p>}
        </div>

        {/* 7. listenerCount */}
        <div className={card}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className={`${label} text-amber-400`}>Listener Count</span>
          </div>
          <p className="text-[11px] text-zinc-500">Count subscribers per phase</p>
          <p className={expect}>Expected: Counts <span className="text-zinc-400">demo:basic</span> subscribers per phase, card shows total and Finished count, log shows <span className="text-zinc-400">[Count]</span> entries</p>
          <button className={btnAmber} onClick={handleCountTest}>Count</button>
          {countResult && <p className={value}>{countResult}</p>}
        </div>

        {/* 8. Clear */}
        <div className={card}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span className={`${label} text-rose-400`}>Clear</span>
          </div>
          <p className="text-[11px] text-zinc-500">Clear subscribers for a specific phase</p>
          <p className={expect}>Expected: Clears <span className="text-zinc-400">demo:basic</span> Finished phase subscribers, subsequent "Emit" will not receive messages, log shows <span className="text-zinc-400">[Clear]</span> entries</p>
          <button className={btnRose} onClick={handleClearTest}>Clear Finished</button>
          {clearResult && <p className={value}>{clearResult}</p>}
        </div>

        {/* 9. Multiple Subscribers */}
        <div className={card}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className={`${label} text-emerald-400`}>Multi Subscribers</span>
          </div>
          <p className="text-[11px] text-zinc-500">Multiple subscribers receive simultaneously</p>
          <p className={expect}>Expected: 3 subscribers register and receive event simultaneously, card shows 3 independent messages (Subscriber #1 / #2 / #3), log shows <span className="text-zinc-400">[Multi]</span> entries</p>
          <button className={btnEmerald} onClick={handleMultiTest}>Trigger</button>
          {multiResult.length > 0 && <div className="space-y-0.5">{multiResult.map((m, i) => <p key={i} className={value}>{m}</p>)}</div>}
        </div>

        {/* 10. Registry API */}
        <div className={card}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
            <span className={`${label} text-violet-400`}>Registry API</span>
          </div>
          <p className="text-[11px] text-zinc-500">getEventNames / getSignal / has</p>
          <p className={expect}>Expected: Queries event registry, card shows all registered event names, log shows <span className="text-zinc-400">[Registry]</span> entries and <span className="text-zinc-400">has()</span> result</p>
          <button className={btnViolet} onClick={handleRegistryCheck}>Query</button>
          {eventNames.length > 0 && <p className={value}>{eventNames.join(', ')}</p>}
        </div>

        {/* 11. Unsubscribe All */}
        <div className={card}>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            <span className={`${label} text-zinc-400`}>Unsubscribe</span>
          </div>
          <p className="text-[11px] text-zinc-500">Cancel all active subscriptions</p>
          <p className={expect}>Expected: Cancels all previously subscribed handlers, subsequent emit operations will not trigger callbacks, log shows <span className="text-zinc-400">[Unsub]</span> entries</p>
          <button className={`${btn} bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700`} onClick={handleUnsubAll}>Cancel All</button>
        </div>
      </div>

      {/* Event Log */}
      <div className="max-w-5xl mx-auto mt-6">
        <div className="p-4 bg-zinc-900/80 rounded-xl border border-zinc-800/60">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              <span className={`${label} text-zinc-400`}>Event Log</span>
            </div>
            <button className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors" onClick={() => setLogs([])}>Clear</button>
          </div>
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {logs.length === 0 && <p className="text-xs text-zinc-600 font-mono">No logs yet</p>}
            {logs.map((log, i) => (
              <p key={i} className={`text-xs font-mono ${i === 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>{log}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};