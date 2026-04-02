import React, {useState} from 'react';
import {createStore} from 'zustand/vanilla';
import {jsompEnv, HtmlRegistry} from '../src';
import {JsompView} from '../src/renderer/react';

// 1. Setup REAL Zustand Store
const zustandStore = createStore(() => ({
  app: {
    title: 'Zustand Power',
    version: '1.2.0'
  },
  settings: {
    theme: 'Dark',
    notifications: true
  }
}));

const legacyPlainObject = {
  user: {
    nick: 'Retro Gamer',
    score: 9999
  },
  system: {
    status: 'OPTIMAL'
  }
};

export const AdapterTest: React.FC = () => {
  const [entities] = useState<any[]>([
    // --- Templates (Inheritance for visual consistency) ---
    {
      id: 'tpl_card',
      type: 'div',
      style_tw: ['p-6', 'bg-zinc-900', 'rounded-2xl', 'border', 'border-zinc-800', 'shadow-xl', 'flex', 'flex-col', 'gap-4']
    },
    {
      id: 'tpl_title',
      type: 'p',
      style_tw: ['text-xs', 'font-black', 'text-amber-500', 'uppercase', 'tracking-widest']
    },
    {
      id: 'tpl_label',
      type: 'span',
      style_tw: ['text-zinc-500', 'text-xs', 'font-mono']
    },
    {
      id: 'tpl_value',
      type: 'span',
      style_tw: ['text-white', 'font-bold', 'font-mono']
    },
    {
      id: 'tpl_btn',
      type: 'button',
      style_tw: ['px-3', 'py-1.5', 'bg-zinc-800', 'hover:bg-zinc-700', 'text-zinc-300', 'text-xs', 'rounded', 'border', 'border-zinc-700', 'transition-all', 'active:scale-95']
    },

    {
      id: 'tpl_btn',
      type: 'button',
      style_tw: ['px-3', 'py-1.5', 'bg-zinc-800', 'hover:bg-zinc-700', 'text-zinc-300', 'text-xs', 'rounded', 'border', 'border-zinc-700', 'transition-all', 'active:scale-95']
    },
    {
      id: 'tpl_json',
      type: 'pre',
      style_tw: ['p-4', 'bg-black/60', 'rounded-xl', 'text-[10px]', 'text-indigo-300', 'font-mono', 'overflow-auto', 'max-h-40', 'border', 'border-zinc-800']
    },

    // --- Layout ---
    {
      id: 'root',
      type: 'div',
      style_tw: ['w-full', 'max-w-4xl', 'grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-8']
    },

    {
      id: 'z_card',
      inherit: 'tpl_card',
      parent: 'root',
      style_tw: ['border-l-4', 'border-l-indigo-500']
    },
    {
      id: 'z_title',
      inherit: 'tpl_title',
      parent: 'z_card',
      props: {children: 'Zustand Integration'},
      style_tw: ['text-indigo-400']
    },
    {
      id: 'z_info',
      parent: 'z_card',
      type: 'div',
      style_tw: ['grid', 'grid-cols-2', 'gap-4', 'bg-black/20', 'p-4', 'rounded-lg']
    },
    {id: 'z_field_1', parent: 'z_info', type: 'div', style_tw: ['flex', 'flex-col', 'gap-1']},
    {id: 'z_lbl_1', inherit: 'tpl_label', parent: 'z_field_1', props: {children: 'APP TITLE'}},
    {id: 'z_val_1', inherit: 'tpl_value', parent: 'z_field_1', props: {children: '{{z.app.title}}'}},

    {id: 'z_field_v', parent: 'z_info', type: 'div', style_tw: ['flex', 'flex-col', 'gap-1']},
    {id: 'z_lbl_v', inherit: 'tpl_label', parent: 'z_field_v', props: {children: 'VERSION'}},
    {id: 'z_val_v', inherit: 'tpl_value', parent: 'z_field_v', props: {children: '{{z.app.version}}'}, style_tw: ['text-indigo-300']},

    {id: 'z_field_2', parent: 'z_info', type: 'div', style_tw: ['flex', 'flex-col', 'gap-1']},
    {id: 'z_lbl_2', inherit: 'tpl_label', parent: 'z_field_2', props: {children: 'THEME'}},
    {id: 'z_val_2', inherit: 'tpl_value', parent: 'z_field_2', props: {children: '{{z.settings.theme}}'}},

    {id: 'z_actions', parent: 'z_card', type: 'div', style_tw: ['flex', 'gap-2']},
    {
      id: 'z_btn_1',
      inherit: 'tpl_btn',
      parent: 'z_actions',
      props: {children: 'Toggle Theme'},
      actions: {'toggle_theme': ['onClick']}
    },

    // --- Card 2: Plain Object Adapter ---
    {
      id: 'obj_card',
      inherit: 'tpl_card',
      parent: 'root',
      style_tw: ['border-l-4', 'border-l-teal-500']
    },
    {
      id: 'obj_title',
      inherit: 'tpl_title',
      parent: 'obj_card',
      props: {children: 'Plain Object Adapter'},
      style_tw: ['text-teal-400']
    },
    {
      id: 'obj_info',
      parent: 'obj_card',
      type: 'div',
      style_tw: ['grid', 'grid-cols-2', 'gap-4', 'bg-black/20', 'p-4', 'rounded-lg']
    },
    {id: 'obj_field_1', parent: 'obj_info', type: 'div', style_tw: ['flex', 'flex-col', 'gap-1']},
    {id: 'obj_lbl_1', inherit: 'tpl_label', parent: 'obj_field_1', props: {children: 'NICKNAME'}},
    {id: 'obj_val_1', inherit: 'tpl_value', parent: 'obj_field_1', props: {children: '{{obj.user.nick}}'}},

    {id: 'obj_field_2', parent: 'obj_info', type: 'div', style_tw: ['flex', 'flex-col', 'gap-1']},
    {id: 'obj_lbl_2', inherit: 'tpl_label', parent: 'obj_field_2', props: {children: 'TOP SCORE'}},
    {id: 'obj_val_2', inherit: 'tpl_value', parent: 'obj_field_2', props: {children: '{{obj.user.score}}'}},

    {id: 'obj_actions', parent: 'obj_card', type: 'div', style_tw: ['flex', 'gap-2']},
    {
      id: 'obj_btn_1',
      inherit: 'tpl_btn',
      parent: 'obj_actions',
      props: {children: 'Bonus points!'},
      actions: {'add_score': ['onClick']}
    },

    // --- Card 3: Advanced Diagnostics (Comprehensive Coverage) ---
    {
      id: 'diag_card',
      inherit: 'tpl_card',
      parent: 'root',
      style_tw: ['md:col-span-2', 'border-amber-500/20']
    },
    {
      id: 'diag_title',
      inherit: 'tpl_title',
      parent: 'diag_card',
      props: {children: 'Registry Orchestration Lab'},
      style_tw: ['text-amber-400']
    },
    {
      id: 'diag_desc',
      parent: 'diag_card',
      type: 'p',
      style_tw: ['text-xs', 'text-zinc-500', 'leading-relaxed'],
      props: {children: 'Below buttons simulate complex state logic that usually resides in business controllers. They are designed to prove that JSOMP can act as a single source of truth for diverse storage backends.'}
    },
    {
      id: 'diag_ops',
      parent: 'diag_card',
      type: 'div',
      style_tw: ['grid', 'grid-cols-1', 'sm:grid-cols-3', 'gap-4', 'my-2']
    },
    {
      id: 'btn_snapshot_grp',
      parent: 'diag_ops',
      type: 'div',
      style_tw: ['flex', 'flex-col', 'gap-2']
    },
    {
      id: 'snapshot_lbl',
      inherit: 'tpl_label',
      parent: 'btn_snapshot_grp',
      props: {children: 'Discovery API'}
    },
    {
      id: 'btn_snapshot',
      inherit: 'tpl_btn',
      parent: 'btn_snapshot_grp',
      style_tw: ['bg-amber-900/40', 'border-amber-700/50', 'text-amber-200'],
      props: {children: 'Global Snapshot'},
      actions: {'take_snapshot': ['onClick']}
    },

    {
      id: 'btn_patch_grp',
      parent: 'diag_ops',
      type: 'div',
      style_tw: ['flex', 'flex-col', 'gap-2']
    },
    {
      id: 'patch_lbl',
      inherit: 'tpl_label',
      parent: 'btn_patch_grp',
      props: {children: 'Partial Update (Z)'}
    },
    {
      id: 'btn_patch_app',
      inherit: 'tpl_btn',
      parent: 'btn_patch_grp',
      props: {children: 'Patch App Meta'},
      actions: {'patch_zustand': ['onClick']}
    },

    {
      id: 'btn_batch_grp',
      parent: 'diag_ops',
      type: 'div',
      style_tw: ['flex', 'flex-col', 'gap-2']
    },
    {
      id: 'batch_lbl',
      inherit: 'tpl_label',
      parent: 'btn_batch_grp',
      props: {children: 'Atomic Multi-Write'}
    },
    {
      id: 'btn_batch',
      inherit: 'tpl_btn',
      parent: 'btn_batch_grp',
      style_tw: ['bg-indigo-600', 'hover:bg-indigo-500', 'text-white', 'border-none'],
      props: {children: 'Sync Z + Obj'},
      actions: {'cross_batch': ['onClick']}
    },
    {
      id: 'diagnosis_view',
      inherit: 'tpl_json',
      parent: 'diag_card',
      props: {children: '{{diagnosis_result}}'}
    }
  ]);

  return (
    <div className="w-full flex flex-col items-center py-16 px-6 bg-[#09090b] min-h-screen text-zinc-100">
      <div className="max-w-4xl w-full mb-12">
        <h1 className="text-4xl font-black mb-2">State Adapters Test</h1>
        <p className="text-zinc-500">Orchestrating Zustand and Plain Objects via Hybrid State Dispatcher.</p>
      </div>

      <JsompView
        beforeMount={(jsomp) => {
          HtmlRegistry.registerAll(jsomp.components);

          // 1. Create and Mount Registries in one go (Simplified V1.2 API)
          jsomp.adapters.zustand('z', zustandStore);
          jsomp.adapters.object('obj', legacyPlainObject);

          // 3. Initial States for diagnostics
          jsomp.atoms.set('diagnosis_result', 'Press a diagnostic button to begin...');

          // 4. Register Actions
          jsomp.actions.register('toggle_theme', {
            require: {
              atoms: {theme: 'z.settings.theme'}
            },
            handler: ({atoms}: any) => {
              atoms.theme = atoms.theme === 'Dark' ? 'Light' : 'Dark';
            }
          });

          jsomp.actions.register('add_score', {
            require: {
              atoms: {user: 'obj.user'}
            },
            handler: ({atoms}: any) => {
              atoms.user.score += 500;
            }
          });

          // Advanced Actions for getSnapshot, patch, batchSet Coverage
          jsomp.actions.register('take_snapshot', {
            handler: () => {
              // Get FULL root snapshot
              const fullSnapshot = jsomp.atoms.getSnapshot!();
              // Exclude the diagnostic field from its own output to avoid recursive nesting
              const {diagnosis_result, ...cleanSnapshot} = fullSnapshot;
              jsomp.atoms.set('diagnosis_result', JSON.stringify(cleanSnapshot, null, 2));
            }
          });

          jsomp.actions.register('patch_zustand', {
            handler: () => {
              // Deep patch via namespace
              jsomp.atoms.patch('z.app', {
                title: 'Patched Title!',
                version: 'V1.2-PATCHED'
              });
              jsomp.atoms.set('diagnosis_result', 'Zustand app patched. Verify above card.');
            }
          });

          jsomp.actions.register('cross_batch', {
            handler: () => {
              // Cross-registry batch update
              jsomp.atoms.batchSet({
                'z.settings.theme': 'Light',
                'obj.user.nick': 'Batch Master',
                'obj.user.score': 77777,
                'diagnosis_result': 'BatchSet executed across stores.'
              });
            }
          });
        }}
        entities={entities}
        rootId="root"
      />
    </div>
  );
};
