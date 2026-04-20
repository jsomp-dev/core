import React, {useCallback, useEffect} from 'react';
import {JsompView, useAtom} from "@jsomp/core/react";
import {jsompEnv, REMOTE_INSTANCE} from "@jsomp/core";

/**
 * Instance Lab v3.1 - Pure JSOMP Logic Implementation
 * 1. All states moved to JSOMP Atoms.
 * 2. All logic moved to Action Tags.
 * 3. All UI logic (if/else) moved to Operators.
 */
export const InstanceTest: React.FC = () => {

  const addLog = useCallback((msg: string) => {
    const current = (jsompEnv.service.atoms.get('lab.logs') ?? []) as string[];
    jsompEnv.service.atoms.set('lab.logs', [`[${new Date().toLocaleTimeString().split(' ')[0]}] ${msg}`, ...current].slice(0, 15));
  }, []);

  useEffect(() => {
    const service = jsompEnv.service;
    if (!service) return;

    // --- 2. Listen to internal lifecycle to update boxStatus atom ---
    const unsub = service.instances.on('box_dynamic', (instance) => {
      service.atoms.set('lab.boxStatus', instance ? 'Available (Ready)' : 'Removed (Cleanup)');
      if (instance) addLog('Event: box_dynamic is READY');
      else addLog('Event: box_dynamic is REMOVED');
    });

    return () => unsub();
  }, []);

  // --- 3. Reactive Topology Control ---
  const [isBoxVisible] = useAtom<boolean>('lab.isBoxVisible');

  const entities = React.useMemo(() => [
    // --- Layout ---
    {
      id: 'lab_root',
      type: 'div',
      style_tw: ['max-w-[1100px]', 'mx-auto', 'p-8', 'grid', 'grid-cols-12', 'gap-8', 'items-start']
    },

    // Left Column
    {
      id: 'left_column',
      type: 'div',
      parent: 'lab_root',
      style_tw: ['col-span-12', 'lg:col-span-7', 'flex', 'flex-col', 'gap-6']
    },
    {
      id: 'header',
      type: 'div',
      parent: 'left_column',
      style_tw: ['mb-2']
    },
    {
      id: 'title',
      type: 'h1',
      parent: 'header',
      props: {children: 'Instance Lab v3.1'},
      style_tw: ['text-3xl', 'font-bold', 'text-white']
    },
    {
      id: 'subtitle',
      type: 'p',
      parent: 'header',
      props: {children: 'Pure JSOMP Logic & Declarative Actions'},
      style_tw: ['text-zinc-500', 'text-sm']
    },

    {
      id: 'main_card',
      type: 'div',
      parent: 'left_column',
      style_tw: ['bg-zinc-900', 'border', 'border-zinc-800', 'rounded-2xl', 'p-8', 'flex', 'flex-col', 'gap-8']
    },

    // Scenarios
    {id: 'sec_1', type: 'div', parent: 'main_card'},
    {id: 'input_tracked', type: 'input', parent: 'sec_1', trackInstance: true, props: {placeholder: 'Focus me via Action Tag...'}, style_tw: ['w-full', 'bg-black', 'border', 'border-zinc-800', 'rounded-lg', 'px-4', 'py-3', 'text-white', 'focus:border-blue-500']},

    {id: 'sec_2', type: 'div', parent: 'main_card'},
    {
      id: 'lab_2',
      type: 'p',
      parent: 'sec_2',
      props: {children: 'Scenario 02: Dynamic Lifecycle (Counter: {{lab.counter}})'},
      style_tw: ['text-[10px]', 'uppercase', 'text-zinc-600', 'mb-3']
    },
    {
      id: 'box_dynamic_wrapper',
      type: 'div',
      parent: 'sec_2',
      style_tw: ['h-16']
    },
    // --- Conditional Mounting ---
    ...(isBoxVisible ? [{
      id: 'box_dynamic',
      type: 'div',
      parent: 'box_dynamic_wrapper',
      trackInstance: true,
      style_tw: ['h-full', 'bg-linear-to-r', 'from-blue-600', 'to-violet-600', 'rounded-xl', 'flex', 'items-center', 'justify-center', 'text-white', 'font-medium', 'shadow-lg', 'shadow-blue-900/20'],
      props: {children: 'Reactive Instance Node'}
    }] : [{
      id: 'box_placeholder',
      type: 'div',
      parent: 'box_dynamic_wrapper',
      style_tw: ['h-full', 'border-2', 'border-dashed', 'border-zinc-800', 'rounded-xl', 'flex', 'items-center', 'justify-center', 'text-zinc-700', 'text-sm'],
      props: {children: 'Instance Destroyed (Ready for Mount)'}
    }]),

    {id: 'sec_3', type: 'div', parent: 'main_card'},
    {id: 'scroll_view', type: 'div', parent: 'sec_3', style_tw: ['h-24', 'overflow-y-auto', 'bg-black', 'rounded-lg', 'border', 'border-zinc-800', 'p-2']},
    ...Array.from({length: 10}).map((_, i) => ({
      id: `list_item_${i}`,
      type: 'div',
      parent: 'scroll_view',
      trackInstance: i === 9,
      style_tw: ['px-3', 'py-2', 'text-sm', i === 9 ? 'text-blue-400 font-bold' : 'text-zinc-500'],
      props: {children: i === 9 ? '🎯 Target Entity' : `Item ${i}`}
    })),

    // Scenario 04: Multi-Mount Subtree Explosion (Extreme Reuse)
    {id: 'sec_4', type: 'div', parent: 'main_card', style_tw: ['border-t', 'border-zinc-800', 'pt-6', 'flex', 'flex-col', 'gap-4']},

    // Mount Points
    {id: 'scope_A', type: 'div', parent: 'sec_4', style_tw: ['p-3', 'bg-zinc-950', 'rounded-lg', 'border', 'border-zinc-800']},
    {id: 'scope_B', type: 'div', parent: 'sec_4', style_tw: ['p-3', 'bg-zinc-950', 'rounded-lg', 'border', 'border-zinc-800']},

    // Template Nodes (Single definition, Multiple parents)
    {
      id: 'scope_label',
      type: 'div',
      parent: ['scope_A', 'scope_B'],
      trackInstance: true,
      props: {children: 'Scope Template: Idle'},
      style_tw: ['text-xs', 'text-zinc-500', 'mb-2']
    },
    {
      id: 'action_btn',
      type: 'button',
      parent: ['scope_A', 'scope_B'],
      actions: {'lab.scoped_ping': ['dom:click']},
      props: {children: 'Ping Template Btn'},
      style_tw: [actionBtnClass, 'text-[10px]', 'py-1']
    },

    // Deep Nested Group (Extreme Backoff)
    {id: 'deep_scope', type: 'div', parent: 'sec_4', style_tw: ['p-3', 'bg-blue-900/10', 'rounded-lg', 'border', 'border-blue-900/30']},
    {id: 'inner_box', type: 'div', parent: 'deep_scope', style_tw: ['p-2', 'bg-black/50', 'rounded-md']},
    {id: 'extreme_target', type: 'div', parent: 'inner_box', trackInstance: true, props: {children: 'Deep Target: Waiting...'}, style_tw: ['text-[10px]', 'text-blue-300', 'mb-2']},
    {id: 'btn_extreme', type: 'button', parent: 'deep_scope', actions: {'lab.extreme_ping': ['dom:click']}, props: {children: 'Extreme Relative Ping'}, style_tw: [actionBtnClass, 'bg-blue-600', 'hover:bg-blue-500', 'text-[10px]']},

    // Right Column
    {
      id: 'right_column',
      type: 'div',
      parent: 'lab_root',
      style_tw: ['col-span-12', 'lg:col-span-5', 'flex', 'flex-col', 'gap-6']
    },

    // Status Card
    {id: 'status_card', type: 'div', parent: 'right_column', style_tw: ['bg-zinc-900', 'border', 'border-zinc-800', 'rounded-2xl', 'p-6']},
    {
      id: 'status_val_box',
      type: 'div',
      parent: 'status_card',
      style_tw: ['px-4', 'py-3', 'rounded-lg', 'bg-black', 'border', 'border-zinc-800', 'flex', 'items-center', 'gap-3']
    },
    {
      id: 'status_indicator',
      type: 'div',
      parent: 'status_val_box',
      style_tw: [
        'w-2', 'h-2', 'rounded-full',
        {opType: 'if', target: '{{lab.boxStatus}}', test: {compare: '==', value: 'Available (Ready)'}, then: 'bg-green-500 shadow-lg shadow-green-500/50', else: 'bg-red-500'}
      ]
    },
    {
      id: 'status_text',
      type: 'p',
      parent: 'status_val_box',
      props: {children: '{{lab.boxStatus}}'},
      style_tw: ['text-sm', 'font-mono', {opType: 'if', target: '{{lab.boxStatus}}', test: {compare: '==', value: 'Available (Ready)'}, then: 'text-green-400', else: 'text-red-400'}]
    },

    // Control Card
    {id: 'bridge_card', type: 'div', parent: 'right_column', style_tw: ['bg-zinc-900', 'border', 'border-zinc-800', 'rounded-2xl', 'p-6', 'flex', 'flex-col', 'gap-4']},

    // --- Actions Grid ---
    {id: 'action_grid', type: 'div', parent: 'bridge_card', style_tw: ['grid', 'grid-cols-2', 'gap-3']},
    {id: 'btn_focus', type: 'button', parent: 'action_grid', actions: {'lab.focus': ['dom:click']}, props: {children: 'Focus Input'}, style_tw: [actionBtnClass]},
    {id: 'btn_render', type: 'button', parent: 'action_grid', actions: {'lab.inc_counter': ['dom:click']}, props: {children: 'Re-render'}, style_tw: [actionBtnClass]},
    {
      id: 'btn_toggle',
      type: 'button',
      parent: 'action_grid',
      actions: {'lab.toggle_box': ['dom:click']},
      props: {
        children: {opType: 'if', target: '{{lab.isBoxVisible}}', then: 'Destroy Instance', else: 'Restore Instance'}
      },
      style_tw: [
        actionBtnClass, 'col-span-2',
        {opType: 'if', target: '{{lab.isBoxVisible}}', then: 'bg-red-950/30 text-red-400 border-red-900/50', else: 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50'}
      ]
    },
    {id: 'btn_scroll', type: 'button', parent: 'action_grid', actions: {'lab.scroll': ['dom:click']}, props: {children: 'Scroll Target'}, style_tw: [actionBtnClass]},
    {id: 'btn_remote', type: 'button', parent: 'action_grid', actions: {'lab.test_remote': ['dom:click']}, props: {children: 'Test Proxy'}, style_tw: [actionBtnClass, 'text-amber-400 border-amber-900/50']},

    // Console
    {id: 'console_card', type: 'div', parent: 'right_column', style_tw: ['bg-black', 'border', 'border-zinc-800', 'rounded-2xl', 'p-5', 'flex', 'flex-col', 'gap-3']},
    {id: 'log_viewer', type: 'LogConsole', parent: 'console_card', props: {logs: '{{lab.logs}}'}}
  ], [isBoxVisible]);

  return (
    <div className="w-full bg-[#050505] min-h-screen text-zinc-200">
      <JsompView
        entities={entities}
        rootId="lab_root"
        id="instance_lab_v3_1"
        components={{
          LogConsole: ({logs}: {logs: string[]}) => (
            <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto scrollbar-hide">
              {(logs || []).length === 0 && <div className="text-zinc-800 text-[11px] italic">Awaiting events...</div>}
              {(logs || []).map((log, i) => (
                <div key={i} className="font-mono text-[11px] text-blue-500/80 animate-in slide-in-from-left-2 duration-300">
                  <span className="text-zinc-700 mr-2">›</span>
                  {log}
                </div>
              ))}
            </div>
          )
        }}
        beforeMount={(service) => {
          // --- 0. Idempotent State Initialization ---
          if (service.atoms.get('lab.isBoxVisible') === undefined) {
            service.atoms.set('lab.isBoxVisible', true);
            service.atoms.set('lab.counter', 0);
            service.atoms.set('lab.logs', []);
            service.atoms.set('lab.boxStatus', 'Available (Ready)');
          }

          // --- 1. Register Logic Actions ---
          service.actions.register('lab.focus', {
            handler: ({contextPath}) => service.instances.get<HTMLInputElement>('input_tracked', contextPath)?.focus()
          });

          service.actions.register('lab.inc_counter', {
            require: {atoms: {count: 'lab.counter'}},
            handler: ({atoms}) => {
              atoms.count = ((atoms.count as number) || 0) + 1;
              addLog(`System: Incremental Patch Executed (Count: ${atoms.count})`);
            }
          });

          service.actions.register('lab.toggle_box', {
            require: {atoms: {visible: 'lab.isBoxVisible'}},
            handler: ({atoms}) => {
              const nextVisible = !atoms.visible;
              atoms.visible = nextVisible;
              addLog(`Action: Toggled box ${nextVisible ? 'Visible' : 'Hidden'}`);
            }
          });

          service.actions.register('lab.scroll', {
            handler: () => {
              const target = service.instances.get<HTMLDivElement>('list_item_9');
              if (target) {
                target.scrollIntoView({behavior: 'smooth', block: 'nearest'});
                addLog('Action: Scrolled to item 9');
              }
            }
          });

          service.actions.register('lab.scoped_ping', {
            handler: ({contextPath}) => {
              // Standard resolution via context
              const isA = contextPath.includes('scope_A');
              const label = service.instances.get<HTMLDivElement>('scope_label', contextPath);
              console.log('contextPath', contextPath);
              console.log('label', label);
              if (label) {
                label.innerText = `Poked ${isA ? 'A' : 'B'} @ ${new Date().toLocaleTimeString().split(' ')[0]}`;
                label.style.color = isA ? '#60a5fa' : '#f472b6';
                addLog(`Action: Scoped Ping resolved scope_label`);
              }
            }
          });

          service.actions.register('lab.extreme_ping', {
            handler: ({contextPath}) => {
              // --- EXTREME CASE ---
              // Caller: deep_scope.btn_extreme
              // Target: deep_scope.inner_box.extreme_target
              // We search for: 'inner_box.extreme_target' (Relative path segment)
              const target = service.instances.get<HTMLDivElement>('inner_box.extreme_target', contextPath);

              if (target) {
                target.innerText = '🎯 EXTREME RESOLUTION SUCCESS';
                target.style.fontWeight = 'bold';
                addLog('Action: Extreme Relative Pathing SUCCESS');
              } else {
                addLog('Action: Extreme Relative Pathing FAILED');
              }
            }
          });

          service.actions.register('lab.test_remote', {
            handler: async () => {
              addLog('System: Mocking REMOTE_INSTANCE...');
              service.instances.set('box_dynamic', REMOTE_INSTANCE);
              const proxy = service.instances.get('box_dynamic');
              addLog('System: Routing proxy.focus() -> Bridge...');
              await proxy.focus();
              addLog('Success: Bridge intercepted call');
            }
          });
        }}
      />
    </div>
  );
};

const actionBtnClass = "px-3 py-2.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-xs font-medium text-zinc-300 hover:bg-zinc-700/50 hover:border-zinc-600 transition-all active:scale-95";
