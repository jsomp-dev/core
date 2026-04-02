import React, {useState} from 'react';
import {jsompEnv, HtmlRegistry} from '../src';
import {JsompView} from '../src/renderer/react';

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

    // --- 3. Feature 1: Proxy Mutation (The Magic Corner) ---
    {
      id: 'proxy_card',
      inherit: 'tpl_card',
      parent: 'root'
    },
    {
      id: 'proxy_title',
      inherit: 'tpl_title',
      parent: 'proxy_card',
      props: {children: 'Magic Proxy Mutation'}
    },
    {
      id: 'proxy_desc',
      inherit: 'tpl_desc',
      parent: 'proxy_card',
      props: {children: 'Directly incrementing states via atoms.count++ in Action Handlers.'}
    },
    {
      id: 'counter_value',
      parent: 'proxy_card',
      type: 'h2',
      props: {children: 'Current: {{magic_count}}'},
      style_tw: ['text-4xl', 'font-mono', 'text-white', 'my-4']
    },
    {
      id: 'inc_btn',
      inherit: 'tpl_btn',
      parent: 'proxy_card',
      props: {children: 'Quick Increment'},
      actions: {
        'magic_inc': ['onClick']
      }
    },

    // --- 4. Feature 2: Deep Object Patching ---
    {
      id: 'patch_card',
      inherit: 'tpl_card',
      parent: 'root'
    },
    {
      id: 'patch_title',
      inherit: 'tpl_title',
      parent: 'patch_card',
      props: {children: 'Deep Object Patching'}
    },
    {
      id: 'patch_desc',
      inherit: 'tpl_desc',
      parent: 'patch_card',
      props: {children: 'Updating nested profile fields using the patch API or Proxy.'}
    },
    {
      id: 'profile_display',
      parent: 'patch_card',
      type: 'div',
      style_tw: ['p-3', 'bg-black/40', 'rounded-xl', 'font-mono', 'text-xs', 'text-emerald-400'],
      props: {
        children: 'USER: {{user_profile.name}} | NOTE: {{user_profile.meta.status}}'
      }
    },
    {
      id: 'patch_btn_group',
      parent: 'patch_card',
      type: 'div',
      style_tw: ['flex', 'gap-2', 'mt-2']
    },
    {
      id: 'patch_btn_1',
      inherit: 'tpl_btn',
      parent: 'patch_btn_group',
      style_tw: ['bg-zinc-800', 'hover:bg-zinc-700', 'flex-1'],
      props: {
        children: 'Set Status: Idle',
        meta: {status: 'Idle'}
      },
      actions: {'update_status': ['onClick']}
    },
    {
      id: 'patch_btn_2',
      inherit: 'tpl_btn',
      parent: 'patch_btn_group',
      style_tw: ['bg-zinc-800', 'hover:bg-zinc-700', 'flex-1'],
      props: {
        children: 'Set Status: Busy',
        meta: {status: 'Busy'}
      },
      actions: {'update_status': ['onClick']}
    },

    // --- 5. Feature 3: Array Management (Stack) ---
    {
      id: 'array_card',
      inherit: 'tpl_card',
      parent: 'root',
      style_tw: ['md:col-span-2']
    },
    {
      id: 'array_title',
      inherit: 'tpl_title',
      parent: 'array_card',
      props: {children: 'Reactive Array Mutations'}
    },
    {
      id: 'stack_display',
      parent: 'array_card',
      type: 'div',
      style_tw: ['flex', 'flex-wrap', 'gap-2', 'min-h-[40px]', 'items-center'],
      props: {
        // Note: Jsomp supports array interpolation in props if renderer allows, 
        // here we just use a helper text
        children: 'Items in Stack: {{stack_count}}'
      }
    },
    {
      id: 'array_ops',
      parent: 'array_card',
      type: 'div',
      style_tw: ['flex', 'gap-4']
    },
    {
      id: 'push_btn',
      inherit: 'tpl_btn',
      parent: 'array_ops',
      props: {children: 'Push Item'},
      actions: {'stack_push': ['onClick']}
    },
    {
      id: 'pop_btn',
      inherit: 'tpl_btn',
      parent: 'array_ops',
      style_tw: ['bg-rose-600', 'hover:bg-rose-500'],
      props: {children: 'Pop Item'},
      actions: {'stack_pop': ['onClick']}
    }
  ]);

  return (
    <div className="w-full flex flex-col items-center py-16 px-6 bg-[#09090b] min-h-screen text-zinc-100">
      <div className="max-w-4xl w-full mb-12">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 mb-4">
          Action Tags V1.2
        </h1>
        <p className="text-zinc-500 text-lg">
          Testing the new Proxy-based state mutation engine and semantic action contracts.
        </p>
      </div>

      <JsompView
        beforeMount={() => {
          const jsomp = jsompEnv.service!;
          HtmlRegistry.registerAll(jsomp.components);

          // 1. Setup Initial States
          jsomp.atoms.batchSet({
            'magic_count': 0,
            'user_profile': {
              name: 'Landing Wizard',
              meta: {status: 'Online'}
            },
            'item_stack': [],
            'stack_count': 0
          });

          // 2. Register Actions with Magic Proxy Support

          // Action 1: Simple Proxy Increment
          jsomp.actions.register('magic_inc', {
            require: {
              atoms: {count: 'magic_count'}
            },
            handler: ({atoms}: any) => {
              atoms.count++; // Magic!
            }
          });

          // Action 2: Contextual Patching
          jsomp.actions.register('update_status', {
            require: {
              atoms: {user: 'user_profile'}
            },
            handler: ({atoms, props}: any) => {
              const newStatus = props.meta?.status || 'Unknown';
              // Using Proxy to patch deep field
              atoms.user.meta.status = newStatus;
            }
          });

          // Action 3: Array Operations
          jsomp.actions.register('stack_push', {
            require: {
              atoms: {
                stack: 'item_stack',
                count: 'stack_count'
              }
            },
            handler: ({atoms}: any) => {
              atoms.stack.push(Math.floor(Math.random() * 100));
              atoms.count = atoms.stack.length;
            }
          });

          jsomp.actions.register('stack_pop', {
            require: {
              atoms: {
                stack: 'item_stack',
                count: 'stack_count'
              }
            },
            handler: ({atoms}: any) => {
              atoms.stack.pop();
              atoms.count = atoms.stack.length;
            }
          });
        }}
        entities={entities}
        rootId="root"
      />

      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl opacity-50">
        <div className="space-y-2">
          <h4 className="text-zinc-300 font-bold text-sm">Direct Mutation</h4>
          <p className="text-xs leading-loose">Handlers now use <code>atoms.count++</code> instead of repository calls, reducing boilerplate and improving readability.</p>
        </div>
        <div className="space-y-2">
          <h4 className="text-zinc-300 font-bold text-sm">Deep Tracking</h4>
          <p className="text-xs leading-loose">Recursive proxies allow modifying nested fields like <code>atoms.user.meta.status</code> with full reactivity.</p>
        </div>
        <div className="space-y-2">
          <h4 className="text-zinc-300 font-bold text-sm">Array Sync</h4>
          <p className="text-xs leading-loose">Built-in support for array methods (push/pop/splice). JSOMP tracks these changes and triggers UI updates automatically.</p>
        </div>
      </div>
    </div>
  );
};
