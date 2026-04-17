import React, {useMemo} from 'react';
import {jsompEnv} from "@jsomp/core";
import {JsompView} from "@jsomp/core/react";

export const OperatorTest: React.FC = () => {
  const entities = useMemo(() => [
    // --- TEMPLATES (UI Parts) ---
    {
      id: 'tpl_state_card',
      type: 'div',
      style_css: {padding: '0.75rem', background: '#18181b', borderRadius: '0.5rem', border: '1px solid #27272a', textAlign: 'center'}
    },
    {
      id: 'tpl_state_card_title',
      type: 'div',
      style_css: {fontSize: '0.6rem', color: '#71717a', textTransform: 'uppercase', marginBottom: '0.25rem'}
    },
    {
      id: 'tpl_state_card_value',
      type: 'div',
      style_css: {fontSize: '0.8rem', color: '#fafafa', fontFamily: 'monospace'}
    },
    {
      id: 'tpl_section',
      type: 'div',
      style_css: {marginBottom: '2rem', padding: '1rem', background: '#18181b', borderRadius: '0.5rem', border: '1px solid #27272a'}
    },
    {
      id: 'tpl_section_title',
      type: 'div',
      style_css: {fontSize: '0.75rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '1rem', fontWeight: 'bold'}
    },
    {
      id: 'tpl_icon_btn',
      type: 'button',
      style_css: {width: '24px', height: '24px', borderRadius: '4px', border: '1px solid #3f3f46', background: '#27272a', color: '#fff', cursor: 'pointer'}
    },
    {
      id: 'tpl_res_box',
      type: 'div',
      style_css: {padding: '0.5rem', background: '#09090b', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#a1a1aa', border: '1px dashed #27272a'}
    },

    // --- LAYOUT ROOT ---
    {
      id: 'app_wrapper',
      type: 'div',
      style_css: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%'
      }
    },
    {
      id: 'op_root',
      type: 'div',
      parent: 'app_wrapper',
      style_css: {
        padding: '2rem',
        maxWidth: '600px',
        width: '100%',
        background: '#09090b',
        borderRadius: '0.75rem',
        border: '1px solid #27272a',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }
    },
    {
      id: 'title',
      type: 'h2',
      parent: 'op_root',
      style_css: {marginBottom: '1.5rem', color: '#fafafa', fontSize: '1.25rem', fontWeight: 'bold'},
      props: {children: 'Operator Expression Lab'}
    },

    // --- SECTION 1: LOGIC & SYNC ---
    {
      id: 'section_1',
      inherit: 'tpl_section',
      parent: 'op_root'
    },
    {
      id: 'sec1_title',
      inherit: 'tpl_section_title',
      parent: 'section_1',
      props: {children: '1. Logic & Toggling'}
    },
    {
      id: 'toggle_row',
      type: 'div',
      parent: 'section_1',
      style_css: {display: 'flex', alignItems: 'center', gap: '1rem'}
    },
    {
      id: 'toggle_btn',
      type: 'button',
      parent: 'toggle_row',
      style_css: {
        padding: '0.4rem 0.8rem',
        borderRadius: '0.25rem',
        background: '#27272a',
        color: '#fafafa',
        border: '1px solid #3f3f46',
        cursor: 'pointer',
        fontSize: '0.875rem'
      },
      actions: {
        'op.toggleExpanded': ['onClick']
      },
      props: {
        children: 'Toggle State (isExpanded)'
      }
    },
    {
      id: 'expanded_badge',
      type: 'span',
      parent: 'toggle_row',
      style_tw: [
        'px-2', 'py-1', 'rounded', 'text-[10px]', 'font-bold', 'uppercase', 'tracking-tighter',
        {
          opType: 'if',
          target: '{{isExpanded}}',
          then: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20',
          else: 'bg-zinc-500/10 text-zinc-500 border border-zinc-500/10'
        }
      ],
      props: {
        children: {
          opType: 'if',
          target: '{{isExpanded}}',
          then: 'Expanded Mode (Active)',
          else: 'Collapsed Mode (Idle)'
        }
      }
    },

    // --- SECTION 2: ARITHMETIC ---
    {
      id: 'section_2',
      inherit: 'tpl_section',
      parent: 'op_root'
    },
    {
      id: 'sec2_title',
      inherit: 'tpl_section_title',
      parent: 'section_2',
      props: {children: '2. Arithmetic Derivation'}
    },
    {
      id: 'arith_row',
      type: 'div',
      parent: 'section_2',
      style_css: {display: 'flex', flexDirection: 'column', gap: '0.8rem'}
    },
    {
      id: 'counter_ctrl',
      type: 'div',
      parent: 'arith_row',
      style_css: {display: 'flex', alignItems: 'center', gap: '0.5rem'}
    },
    {
      id: 'btn_minus',
      inherit: 'tpl_icon_btn',
      parent: 'counter_ctrl',
      actions: {
        'op.decrement': ['onClick']
      },
      props: {children: '-'}
    },
    {
      id: 'counter_val',
      type: 'span',
      parent: 'counter_ctrl',
      style_css: {minWidth: '40px', textAlign: 'center', fontWeight: 'bold', fontSize: '1.2rem'},
      props: {children: '{{count}}'}
    },
    {
      id: 'btn_plus',
      inherit: 'tpl_icon_btn',
      parent: 'counter_ctrl',
      actions: {
        'op.increment': ['onClick']
      },
      props: {children: '+'}
    },
    {
      id: 'arith_results',
      type: 'div',
      parent: 'arith_row',
      style_css: {display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem'}
    },
    {
      id: 'res_1',
      inherit: 'tpl_res_box',
      parent: 'arith_results',
      props: {children: 'Add: {{count}} + 10 = {{op_add}}'}
    },
    {
      id: 'op_add_node',
      type: 'hidden', // System node to hold calculated value if needed, but here we use it in text
      props: {
        // This is a dummy example to show how we might calculate it once
        // But usually literal ops in props is easier.
      }
    },
    {
      id: 'res_2',
      inherit: 'tpl_res_box',
      parent: 'arith_results',
      props: {
        children: {
          opType: 'pipeline',
          target: '{{count}}',
          steps: [
            {opType: 'mult', value: 100},
            {opType: 'if', test: {compare: '>', value: 500}, then: 'MAX (500+)', else: 'Percent: {{$value}}%'}
          ]
        }
      }
    },

    // --- SECTION 3: MATCH & PIPELINE ---
    {
      id: 'section_3',
      inherit: 'tpl_section',
      parent: 'op_root',
      style_css: {marginBottom: 0} // Override margin for the last section
    },
    {
      id: 'sec3_title',
      inherit: 'tpl_section_title',
      parent: 'section_3',
      props: {children: '3. Pattern Match & Pipeline'}
    },
    {
      id: 'match_row',
      type: 'div',
      parent: 'section_3',
      style_css: {display: 'flex', flexDirection: 'column', gap: '0.8rem'}
    },
    {
      id: 'role_select',
      type: 'select',
      parent: 'match_row',
      style_css: {
        width: '100%',
        padding: '0.4rem',
        background: '#09090b',
        border: '1px solid #27272a',
        borderRadius: '0.25rem',
        color: '#fafafa',
        fontSize: '0.875rem'
      },
      actions: {
        'op.setRole': ['onChange']
      },
      props: {
        value: '{{userRole}}'
      }
    },
    {id: 'r1', type: 'option', parent: 'role_select', props: {value: 'user', children: 'Standard User'}},
    {id: 'r2', type: 'option', parent: 'role_select', props: {value: 'editor', children: 'Editor'}},
    {id: 'r3', type: 'option', parent: 'role_select', props: {value: 'admin', children: 'Administrator'}},

    {
      id: 'role_badge',
      type: 'div',
      parent: 'match_row',
      style_tw: ['text-xs', 'p-2', 'rounded', 'border', 'text-center', {
        opType: 'match',
        target: '{{userRole}}',
        cases: [
          {value: 'admin', return: 'bg-red-500/10 border-red-500/20 text-red-400'},
          {value: 'editor', return: 'bg-blue-500/10 border-blue-500/20 text-blue-400'}
        ],
        default: 'bg-zinc-500/10 border-zinc-500/20 text-zinc-400'
      }],
      props: {
        children: {
          opType: 'match',
          target: '{{userRole}}',
          cases: [
            {value: 'admin', return: 'SYSTEM AUTHORITY: ADMIN'},
            {value: 'editor', return: 'CONTENT MANAGER: EDITOR'}
          ],
          default: 'LEVEL 1: USER'
        }
      }
    },

    // Virtual calculation for simple interpolation display
    {
      id: 'hidden_calc',
      type: 'hidden',
      props: {
        // We name the operator so it can be referenced by {{op_add}} elsewhere
        'op_add': {opType: 'add', name: 'op_add', target: '{{count}}', value: 10}
      }
    },

    // --- SECTION 4: GLOBAL STATE CARDS (Using Inherit) ---
    {
      id: 'cards_container',
      type: 'div',
      parent: 'app_wrapper',
      style_css: {
        marginTop: '2rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '1rem',
        width: '100%',
        maxWidth: '600px'
      }
    },
    // Count Card
    {id: 'card_count', inherit: 'tpl_state_card', parent: 'cards_container'},
    {id: 'card_count_title', inherit: 'tpl_state_card_title', parent: 'card_count', props: {children: 'count'}},
    {id: 'card_count_val', inherit: 'tpl_state_card_value', parent: 'card_count', props: {children: '{{count}}'}},

    // isExpanded Card
    {id: 'card_isExpanded', inherit: 'tpl_state_card', parent: 'cards_container'},
    {id: 'card_isExpanded_title', inherit: 'tpl_state_card_title', parent: 'card_isExpanded', props: {children: 'isExpanded'}},
    {
      id: 'card_isExpanded_val',
      inherit: 'tpl_state_card_value',
      parent: 'card_isExpanded',
      props: {
        children: {opType: 'if', target: '{{isExpanded}}', then: 'true', else: 'false'}
      }
    },

    // userRole Card
    {id: 'card_userRole', inherit: 'tpl_state_card', parent: 'cards_container'},
    {id: 'card_userRole_title', inherit: 'tpl_state_card_title', parent: 'card_userRole', props: {children: 'userRole'}},
    {id: 'card_userRole_val', inherit: 'tpl_state_card_value', parent: 'card_userRole', props: {children: '{{userRole}}'}},

    // price Card
    {id: 'card_price', inherit: 'tpl_state_card', parent: 'cards_container'},
    {id: 'card_price_title', inherit: 'tpl_state_card_title', parent: 'card_price', props: {children: 'price'}},
    {id: 'card_price_val', inherit: 'tpl_state_card_value', parent: 'card_price', props: {children: '{{price}}'}}
  ], []);

  return (
    <div style={{padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%'}}>
      <JsompView
        entities={entities}
        rootId="app_wrapper"
        beforeMount={() => {
          // 1. Prepare Local States
          const reg = jsompEnv.service!.atoms;
          reg.set('count', 5);
          reg.set('isExpanded', false);
          reg.set('userRole', 'user');
          reg.set('price', 120);

          // 2. Register Actions (Successfully resolved after timing fix)
          const actions = jsompEnv.service!.actions;
          actions.register('op.toggleExpanded', {
            require: {atoms: {isExpanded: 'isExpanded'}},
            handler: ({atoms}) => {
              atoms.isExpanded = !atoms.isExpanded;
              console.log('toggleExpanded', String(atoms.isExpanded), 'to', String(!(atoms.isExpanded)));
            }
          });
          actions.register('op.increment', {
            require: {atoms: {count: 'count'}},
            handler: ({atoms}) => {
              atoms.count = Number(atoms.count) + 1;
            }
          });
          actions.register('op.decrement', {
            require: {atoms: {count: 'count'}},
            handler: ({atoms}) => {
              atoms.count = Number(atoms.count) - 1;
            }
          });
          actions.register('op.setRole', {
            require: {atoms: {userRole: 'userRole'}},
            handler: ({atoms, event}) => {
              atoms.userRole = event.target.value;
            }
          });
        }}
      />
    </div>
  );
};
