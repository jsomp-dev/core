import React, {useState, useEffect} from 'react';
import {jsompEnv, HtmlRegistry} from '../src';
import {JsompView} from '@jsomp/core/react';

export const ActionTagsTest: React.FC = () => {
  const [entities] = useState<any[]>([
    // --- 1. Templates (Inheritable Base Nodes) ---
    {
      id: 'tpl_card',
      type: 'div',
      style_tw: ['p-6', 'bg-zinc-900', 'rounded-2xl', 'border', 'border-zinc-800', 'shadow-xl', 'flex', 'flex-col', 'gap-4', 'transition-all', 'hover:border-zinc-700']
    },
    {
      id: 'tpl_title',
      type: 'p',
      style_tw: ['text-xs', 'font-black', 'text-indigo-400', 'uppercase', 'tracking-[0.2em]', 'mb-1']
    },
    {
      id: 'tpl_desc',
      type: 'p',
      style_tw: ['text-sm', 'text-zinc-500', 'mb-4', 'leading-relaxed']
    },
    {
      id: 'tpl_btn',
      type: 'button',
      style_tw: ['px-4', 'py-2', 'bg-indigo-600', 'hover:bg-indigo-500', 'text-white', 'rounded-lg', 'font-bold', 'transition-colors', 'active:scale-95']
    },

    // --- 2. Layout Structure ---
    {
      id: 'root',
      type: 'div',
      style_tw: ['w-full', 'max-w-4xl', 'grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6']
    },

    // --- 3. Feature 1: Proxy Mutation (Standard Triggers) ---
    {
      id: 'proxy_card',
      inherit: 'tpl_card',
      parent: 'root'
    },
    {
      id: 'proxy_title',
      inherit: 'tpl_title',
      parent: 'proxy_card',
      props: {children: 'Standard DOM Triggers'}
    },
    {
      id: 'counter_value',
      parent: 'proxy_card',
      type: 'h2',
      props: {children: 'Count: {{magic_count}}'},
      style_tw: ['text-4xl', 'font-mono', 'text-white', 'my-4']
    },
    {
      id: 'inc_btn',
      inherit: 'tpl_btn',
      parent: 'proxy_card',
      props: {children: 'dom:click (Increment)'},
      actions: {
        'magic_inc': ['dom:click']
      }
    },
    {
      id: 'dbl_btn',
      inherit: 'tpl_btn',
      parent: 'proxy_card',
      style_tw: ['bg-zinc-800', 'hover:bg-zinc-700'],
      props: {children: 'dom:double_click (Reset)'},
      actions: {
        'magic_reset': ['dom:double_click']
      }
    },

    // --- 4. Feature 2: Keyboard Shortcuts ---
    {
      id: 'key_card',
      inherit: 'tpl_card',
      parent: 'root'
    },
    {
      id: 'key_title',
      inherit: 'tpl_title',
      parent: 'key_card',
      style_tw: ['text-amber-400'],
      props: {children: 'Keyboard Shortcuts'}
    },
    {
      id: 'key_desc',
      inherit: 'tpl_desc',
      parent: 'key_card',
      props: {children: 'Focus this card and try keys!'}
    },
    {
      id: 'key_area',
      parent: 'key_card',
      type: 'div',
      props: {tabIndex: 0, children: 'Click to Focus Area'},
      style_tw: ['p-8', 'bg-zinc-950/50', 'rounded-xl', 'border-2', 'border-dashed', 'border-zinc-800', 'text-center', 'text-xs', 'text-zinc-500', 'focus:border-indigo-500', 'focus:bg-indigo-500/5', 'focus:text-indigo-400', 'focus:outline-none', 'transition-all', 'cursor-pointer'],
      actions: {
        'log_key': ['key:escape', 'key:enter', 'key:ctrl+s']
      }
    },
    {
      id: 'key_feedback',
      parent: 'key_card',
      type: 'p',
      props: {children: 'Last Key: {{last_trigger}}'},
      style_tw: ['text-xs', 'font-mono', 'text-amber-500']
    },

    // --- 5. Feature 3: Custom Namespace (Automated Bridge) ---
    {
      id: 'runtime_card',
      inherit: 'tpl_card',
      parent: 'root',
      style_tw: ['md:col-span-2', 'border-emerald-900/50']
    },
    {
      id: 'runtime_title',
      inherit: 'tpl_title',
      parent: 'runtime_card',
      style_tw: ['text-emerald-400'],
      props: {children: 'Automated Custom Bridge (Runtime)'}
    },
    {
      id: 'runtime_desc',
      inherit: 'tpl_desc',
      parent: 'runtime_card',
      props: {children: 'Listening to external "runtime:system_notify" events via automated proxy host.'}
    },
    {
      id: 'notification_display',
      parent: 'runtime_card',
      type: 'div',
      style_tw: ['p-4', 'bg-emerald-950/30', 'rounded-xl', 'border', 'border-emerald-800/50', 'text-sm', 'text-emerald-200', 'min-h-[3rem]', 'flex', 'items-center', 'gap-3'],
      props: {
        children: 'Message: {{notification_msg}}'
      },
      actions: {
        'handle_notify': ['runtime:system_notify']
      }
    }
  ]);

  // Mock Global Backend Registry for the playground
  useEffect(() => {
    const jsomp = jsompEnv.service!;

    // Simulating a backend emitter
    const listeners = new Set<(p: any) => void>();

    // Register the custom Trigger Source for 'runtime:' namespace
    jsomp.actions.registerTriggerSource('runtime', {
      subscribe: (eventName: string, emit: (p: any) => void) => {
        if (eventName === 'system_notify') {
          listeners.add(emit);
          return () => listeners.delete(emit);
        }
        return () => { };
      }
    });

    // Simulate backend push every 5 seconds
    const timer = setInterval(() => {
      const msg = `Alert at ${new Date().toLocaleTimeString()}`;
      listeners.forEach(l => l(msg));
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="w-full flex flex-col items-center py-16 px-6 bg-[#09090b] min-h-screen text-zinc-100">
      <div className="max-w-4xl w-full mb-12">
        <div className="flex justify-between items-end mb-4">
          <div>
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-2">
              Action Tags V1.2
            </h1>
            <p className="text-zinc-500 text-lg">
              Testing Framework-Agnostic Triggers & Automated Lifecycle Bridging.
            </p>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-zinc-800 rounded-full text-[10px] font-bold text-zinc-400 uppercase tracking-widest border border-zinc-700">
              Framework: {jsompEnv.service?.frameworks.getActive()?.target ?? 'None'}
            </span>
          </div>
        </div>
      </div>

      <JsompView
        beforeMount={() => {
          const jsomp = jsompEnv.service!;
          HtmlRegistry.registerAll(jsomp.components);

          // 1. Setup Initial States
          jsomp.atoms.batchSet({
            'magic_count': 0,
            'last_trigger': 'None',
            'notification_msg': 'Waiting for host signal...'
          });

          // 2. Register Actions

          // Incrementor
          jsomp.actions.register('magic_inc', {
            require: {
              atoms: {count: 'magic_count'}
            },
            handler: ({atoms}: any) => {
              atoms.count++;
            }
          });

          // Resetter (Triggered by dblclick)
          jsomp.actions.register('magic_reset', {
            require: {
              atoms: {count: 'magic_count'}
            },
            handler: ({atoms}: any) => {
              atoms.count = 0;
            }
          });

          // Key Logger
          jsomp.actions.register('log_key', {
            require: {
              atoms: {last: 'last_trigger'}
            },
            handler: ({atoms, trigger}: any) => {
              atoms.last = `[${trigger}]`;
            }
          });

          // Notification Handler (Custom Namespace)
          jsomp.actions.register('handle_notify', {
            require: {
              atoms: {msg: 'notification_msg'}
            },
            handler: ({atoms, event, namespace, eventName}: any) => {
              atoms.msg = `[${namespace}] ${eventName}: ${event}`;
            }
          });
        }}
        entities={entities}
        rootId="root"
        id="action_tags_test"
      />

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl opacity-50">
        <div className="space-y-2">
          <h4 className="text-zinc-300 font-bold text-sm">Host-Agnostic DOM</h4>
          <p className="text-xs leading-loose">Namespace <code>dom:*</code> triggers are mapped to host props (e.g., <code>onDoubleClick</code>) with snake_case neutrality.</p>
        </div>
        <div className="space-y-2">
          <h4 className="text-zinc-300 font-bold text-sm">Smart Shortcuts</h4>
          <p className="text-xs leading-loose">Namespace <code>key:*</code> provides built-in keyboard filtering and automatic lifecycle management.</p>
        </div>
        <div className="space-y-2">
          <h4 className="text-zinc-300 font-bold text-sm">Namespace Bridge</h4>
          <p className="text-xs leading-loose">Custom namespaces like <code>runtime:*</code> can be connected to any environment API via the Trigger Host registry.</p>
        </div>
      </div>
    </div>
  );
};
