import React, {useEffect, useMemo, useState} from 'react';
import {jsompEnv} from "@jsomp/core";
import {JsompView} from "@jsomp/core/react";

const MODE_META = {
  feed:    {label: 'Feed',    color: '#16a34a', bg: '#052e16', desc: 'Deep merge — shallow object merge, array union, actions event merge'},
  override: {label: 'Override', color: '#dc2626', bg: '#450a0a', desc: 'Override — replace same-level fields directly, no old data retained'},
  replace: {label: 'Replace',  color: '#d97706', bg: '#451a03', desc: 'Replace — completely replace target node (preserving id)'},
};

export const ModifyTest: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const jsomp = jsompEnv.service;

      jsomp.entities.register('comp-card', [
        {id: 'card_root', type: 'div', style_css: {padding: '1rem', background: '#18181b', borderRadius: '0.5rem', border: '1px solid #27272a'}},
        {id: 'card_title', parent: 'card_root', type: 'h3', style_css: {color: '#fff', marginBottom: '0.5rem'}, props: {children: 'Default Card'}},
        {id: 'card_body', parent: 'card_root', type: 'p', style_css: {color: '#a1a1aa', fontSize: '0.8rem'}, props: {children: 'Pulled from entity pool.'}},
      ], {conflictMode: 'override'});

      jsomp.atoms.set('modifyMode', 'override');

      jsomp.actions.register('set_dynamic_mode', {
        require: {
          atoms: { modifyMode: 'modifyMode' },
          props: { modeValue: 'string' }
        },
        handler: ({ atoms, props }) => {
          atoms.modifyMode = props.modeValue;
        }
      });

      setIsReady(true);
    };
    init();
  }, []);

  const entities = useMemo(() => [
    // ===== ROOT =====
    {id: 'root', type: 'div', style_css: {padding: '2rem', maxWidth: '860px', width: '100%', background: '#09090b', borderRadius: '0.75rem', border: '1px solid #27272a'}},

    // ===== HERO =====
    {id: 'hero', parent: 'root', type: 'div', style_css: {marginBottom: '2rem'}},
    {id: 'hero_badge', parent: 'hero', type: 'span', style_css: {display: 'inline-block', padding: '0.2rem 0.6rem', background: '#1e1b4b', color: '#a5b4fc', borderRadius: '0.25rem', fontSize: '0.65rem', fontWeight: 'bold', fontFamily: 'monospace', marginBottom: '0.5rem'}, props: {children: 'JSOMP Core / Modify'}},
    {id: 'hero_title', parent: 'hero', type: 'h1', style_css: {color: '#fafafa', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.25rem'}, props: {children: 'Modify Field Lab'}},
    {id: 'hero_desc', parent: 'hero', type: 'p', style_css: {color: '#a1a1aa', fontSize: '0.85rem', lineHeight: '1.6'}, props: {children: 'The modify field extends IJsompNode[] from pure "add nodes" to a universal node operation sequence. Each modify node locates its target via target, mode determines the merge strategy, and the node itself is suppressed after operation and does not participate in rendering.'}},

    // ===== MODE LEGEND =====
    {id: 'legend', parent: 'root', type: 'div', style_css: {display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap'}},
    ...Object.entries(MODE_META).map(([key, meta]) => ({
      id: `legend_${key}`, parent: 'legend', type: 'div',
      style_css: {display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', background: meta.bg, borderRadius: '0.25rem', border: `1px solid ${meta.color}33`},
      props: {children: null},
      children: [
        {id: `legend_dot_${key}`, type: 'span', style_css: {width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: meta.color, display: 'inline-block'}},
        {id: `legend_label_${key}`, type: 'span', style_css: {color: meta.color, fontSize: '0.75rem', fontWeight: 'bold'}, props: {children: meta.label}},
        {id: `legend_desc_${key}`, type: 'span', style_css: {color: '#a1a1aa', fontSize: '0.7rem'}, props: {children: meta.desc}},
      ],
    })),

    // ===== SCENARIO 1: Feed =====
    {id: 's1', parent: 'root', type: 'div', style_css: {padding: '1.25rem', background: '#18181b', borderRadius: '0.5rem', border: '1px solid #27272a', marginBottom: '1rem'}},
    {id: 's1_header', parent: 's1', type: 'div', style_css: {display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem'}},
    {id: 's1_num', parent: 's1_header', type: 'span', style_css: {display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: '#16a34a', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold'}, props: {children: '1'}},
    {id: 's1_title', parent: 's1_header', type: 'span', style_css: {color: '#fafafa', fontSize: '0.9rem', fontWeight: 'bold'}, props: {children: 'Feed Mode — Deep Merge'}},
    {id: 's1_badge', parent: 's1_header', type: 'span', style_css: {padding: '0.15rem 0.4rem', background: '#052e16', color: '#86efac', borderRadius: '0.2rem', fontSize: '0.6rem', fontFamily: 'monospace', border: '1px solid #16a34a44'}, props: {children: 'mode: "feed"'}},
    {id: 's1_desc', parent: 's1', type: 'p', style_css: {color: '#a1a1aa', fontSize: '0.78rem', marginBottom: '0.75rem', lineHeight: '1.5'}, props: {children: 'modifier props shallow-merge to target, style_tw array takes union, style_css object shallow-merges, actions merge by event tag. Target original data is preserved, only supplementing/overwriting same-named fields.'}},
    {id: 's1_demo', parent: 's1', type: 'div', style_css: {display: 'flex', flexDirection: 'column', gap: '0.5rem'}},
    {id: 'card_a', parent: 's1_demo', type: 'div', style_css: {padding: '0.75rem', background: '#1e3a5f', borderRadius: '0.375rem', color: '#93c5fd', fontSize: '0.8rem', border: '1px solid #3b82f644'}, props: {children: 'Card A — Original node (blue), modifier props/style will merge into it'}},
    {
      id: 'mod_feed', parent: 's1_demo', type: 'div',
      style_css: {padding: '0.75rem', background: '#14532d', borderRadius: '0.375rem', color: '#86efac', fontSize: '0.8rem', border: '1px solid #16a34a44'},
      props: {children: 'Card A — Already feed-merged (green modifier children injected)'},
      modify: {target: 'card_a', mode: 'feed'}
    },

    // ===== SCENARIO 2: Override =====
    {id: 's2', parent: 'root', type: 'div', style_css: {padding: '1.25rem', background: '#18181b', borderRadius: '0.5rem', border: '1px solid #27272a', marginBottom: '1rem'}},
    {id: 's2_header', parent: 's2', type: 'div', style_css: {display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem'}},
    {id: 's2_num', parent: 's2_header', type: 'span', style_css: {display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: '#dc2626', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold'}, props: {children: '2'}},
    {id: 's2_title', parent: 's2_header', type: 'span', style_css: {color: '#fafafa', fontSize: '0.9rem', fontWeight: 'bold'}, props: {children: 'Override Mode — Field Override'}},
    {id: 's2_badge', parent: 's2_header', type: 'span', style_css: {padding: '0.15rem 0.4rem', background: '#450a0a', color: '#fca5a5', borderRadius: '0.2rem', fontSize: '0.6rem', fontFamily: 'monospace', border: '1px solid #dc262644'}, props: {children: 'mode: "override"'}},
    {id: 's2_desc', parent: 's2', type: 'p', style_css: {color: '#a1a1aa', fontSize: '0.78rem', marginBottom: '0.75rem', lineHeight: '1.5'}, props: {children: 'modifier same-level fields directly replace target fields without merging. Fields on target not covered by modifier remain unchanged. Suitable for scenarios requiring precise control of specific fields.'}},
    {id: 's2_demo', parent: 's2', type: 'div', style_css: {display: 'flex', flexDirection: 'column', gap: '0.5rem'}},
    {id: 'card_b', parent: 's2_demo', type: 'div', style_css: {padding: '0.75rem', background: '#1e3a5f', borderRadius: '0.375rem', color: '#93c5fd', fontSize: '0.8rem', border: '1px solid #3b82f644'}, props: {children: 'Card B — Original node, style_css will be overridden by modifier'}},
    {
      id: 'mod_override', parent: 's2_demo', type: 'div',
      style_css: {padding: '0.75rem', background: '#7f1d1d', borderRadius: '0.375rem', color: '#fca5a5', fontSize: '0.8rem', border: '1px solid #dc262644'},
      props: {children: 'Card B — Already overridden (red modifier children overwritten)'},
      modify: {target: 'card_b', mode: 'override'}
    },

    // ===== SCENARIO 3: Replace =====
    {id: 's3', parent: 'root', type: 'div', style_css: {padding: '1.25rem', background: '#18181b', borderRadius: '0.5rem', border: '1px solid #27272a', marginBottom: '1rem'}},
    {id: 's3_header', parent: 's3', type: 'div', style_css: {display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem'}},
    {id: 's3_num', parent: 's3_header', type: 'span', style_css: {display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: '#d97706', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold'}, props: {children: '3'}},
    {id: 's3_title', parent: 's3_header', type: 'span', style_css: {color: '#fafafa', fontSize: '0.9rem', fontWeight: 'bold'}, props: {children: 'Replace Mode — Complete Replacement'}},
    {id: 's3_badge', parent: 's3_header', type: 'span', style_css: {padding: '0.15rem 0.4rem', background: '#451a03', color: '#fde68a', borderRadius: '0.2rem', fontSize: '0.6rem', fontFamily: 'monospace', border: '1px solid #d9770644'}, props: {children: 'mode: "replace"'}},
    {id: 's3_desc', parent: 's3', type: 'p', style_css: {color: '#a1a1aa', fontSize: '0.78rem', marginBottom: '0.75rem', lineHeight: '1.5'}, props: {children: 'modifier completely replaces target node, only id is preserved. Here type changes from div to span, all styles and props are replaced. Requires allowDangerousFields to unlock high-risk fields like type.'}},
    {id: 's3_demo', parent: 's3', type: 'div', style_css: {display: 'flex', flexDirection: 'column', gap: '0.5rem'}},
    {id: 'card_c', parent: 's3_demo', type: 'div', style_css: {padding: '0.75rem', background: '#1e3a5f', borderRadius: '0.375rem', color: '#93c5fd', fontSize: '0.8rem', border: '1px solid #3b82f644'}, props: {children: 'Card C — Original div node, will be completely replaced'}},
    {
      id: 'mod_replace', parent: 's3_demo', type: 'span',
      style_css: {padding: '0.75rem', background: '#713f12', borderRadius: '0.375rem', color: '#fde68a', fontSize: '0.8rem', border: '1px solid #d9770644'},
      props: {children: 'Modifier (yellow) — Replaces Card C with span, itself is suppressed'},
      modify: {target: 'card_c', mode: 'replace', allowDangerousFields: ['type']}
    },

    // ===== SCENARIO 4: Dangerous Fields =====
    {id: 's4', parent: 'root', type: 'div', style_css: {padding: '1.25rem', background: '#18181b', borderRadius: '0.5rem', border: '1px solid #27272a', marginBottom: '1rem'}},
    {id: 's4_header', parent: 's4', type: 'div', style_css: {display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem'}},
    {id: 's4_num', parent: 's4_header', type: 'span', style_css: {display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: '#6b21a8', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold'}, props: {children: '4'}},
    {id: 's4_title', parent: 's4_header', type: 'span', style_css: {color: '#fafafa', fontSize: '0.9rem', fontWeight: 'bold'}, props: {children: 'Dangerous Fields Protection'}},
    {id: 's4_badge', parent: 's4_header', type: 'span', style_css: {padding: '0.15rem 0.4rem', background: '#3b0764', color: '#d8b4fe', borderRadius: '0.2rem', fontSize: '0.6rem', fontFamily: 'monospace', border: '1px solid #9333ea44'}, props: {children: 'allowDangerousFields'}},
    {id: 's4_desc', parent: 's4', type: 'p', style_css: {color: '#a1a1aa', fontSize: '0.78rem', marginBottom: '0.75rem', lineHeight: '1.5'}, props: {children: 'High-risk fields like type, parent, inherit are not modifiable by default. The modifier below tries to change Card D type to span, but since allowDangerousFields is not declared, type remains unchanged (still div).'}},
    {id: 's4_demo', parent: 's4', type: 'div', style_css: {display: 'flex', flexDirection: 'column', gap: '0.5rem'}},
    {id: 'card_d', parent: 's4_demo', type: 'div', style_css: {padding: '0.75rem', background: '#1e3a5f', borderRadius: '0.375rem', color: '#93c5fd', fontSize: '0.8rem', border: '1px solid #3b82f644'}, props: {children: 'Card D — type is protected, will not be overwritten by modifier type:span'}},
    {
      id: 'mod_dangerous', parent: 's4_demo', type: 'span',
      style_css: {padding: '0.75rem', background: '#4c1d95', borderRadius: '0.375rem', color: '#c4b5fd', fontSize: '0.8rem', border: '1px solid #9333ea44'},
      props: {children: 'Modifier (purple) — Attempts to change type to span, blocked by protection mechanism'},
      modify: {target: 'card_d', mode: 'override'}
    },

    // ===== SCENARIO 5: Dynamic Mode =====
    {id: 's5', parent: 'root', type: 'div', style_css: {padding: '1.25rem', background: '#18181b', borderRadius: '0.5rem', border: '1px solid #27272a', marginBottom: '1rem'}},
    {id: 's5_header', parent: 's5', type: 'div', style_css: {display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem'}},
    {id: 's5_num', parent: 's5_header', type: 'span', style_css: {display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: '#0891b2', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold'}, props: {children: '5'}},
    {id: 's5_title', parent: 's5_header', type: 'span', style_css: {color: '#fafafa', fontSize: '0.9rem', fontWeight: 'bold'}, props: {children: 'Dynamic Mode — Mustache Binding'}},
    {id: 's5_badge', parent: 's5_header', type: 'span', style_css: {padding: '0.15rem 0.4rem', background: '#164e63', color: '#67e8f9', borderRadius: '0.2rem', fontSize: '0.6rem', fontFamily: 'monospace', border: '1px solid #06b6d444'}, props: {children: 'mode: "{{modifyMode}}"'}},
    {id: 's5_desc', parent: 's5', type: 'p', style_css: {color: '#a1a1aa', fontSize: '0.78rem', marginBottom: '0.75rem', lineHeight: '1.5'}, props: {children: 'mode field supports Mustache binding, dynamically fetching value from atom state. Click buttons below to switch mode, modifier merge strategy will change in real-time.'}},
    {id: 's5_controls', parent: 's5', type: 'div', style_css: {display: 'flex', gap: '0.5rem', marginBottom: '0.75rem'}},
    ...(['feed', 'override', 'replace'] as const).map(m => ({
      id: `s5_btn_${m}`, parent: 's5_controls', type: 'button',
      style_css: {padding: '0.35rem 0.7rem', borderRadius: '0.25rem', border: '1px solid #3f3f46', cursor: 'pointer', fontSize: '0.75rem', background: {opType:'if', target:'{{modifyMode}}',test: {compare: '==', value: m}, then: MODE_META[m].color, else: '#27272a'}, color: '#fafafa', transition: 'all 0.2s'},
      props: {children: `Set ${MODE_META[m].label}`, modeValue: m},
      actions: { set_dynamic_mode: ['dom:click'] }
    })),
    {id: 's5_demo', parent: 's5', type: 'div', style_css: {display: 'flex', flexDirection: 'column', gap: '0.5rem'}},
    {id: 'card_e', parent: 's5_demo', type: 'div', style_css: {padding: '0.75rem', background: '#1e3a5f', borderRadius: '0.375rem', color: '#93c5fd', fontSize: '0.8rem', border: '1px solid #3b82f644'}, props: {children: `Card E — Current mode from atom: {{modifyMode}}`}},
    {
      id: 'mod_dynamic', parent: 's5_demo', type: 'div',
      style_css: {padding: '0.75rem', background: '#155e75', borderRadius: '0.375rem', color: '#67e8f9', fontSize: '0.8rem', border: '1px solid #06b6d444'},
      props: {children: `Modifier (cyan) — mode bound to {{modifyMode}}, current value: {{modifyMode}}`},
      modify: {target: 'card_e', mode: '{{modifyMode}}'}
    },

    // ===== SCENARIO 6: Pull Integration =====
    {id: 's6', parent: 'root', type: 'div', style_css: {padding: '1.25rem', background: '#18181b', borderRadius: '0.5rem', border: '1px solid #27272a', marginBottom: '1rem'}},
    {id: 's6_header', parent: 's6', type: 'div', style_css: {display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem'}},
    {id: 's6_num', parent: 's6_header', type: 'span', style_css: {display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '1.5rem', height: '1.5rem', borderRadius: '50%', background: '#be185d', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold'}, props: {children: '6'}},
    {id: 's6_title', parent: 's6_header', type: 'span', style_css: {color: '#fafafa', fontSize: '0.9rem', fontWeight: 'bold'}, props: {children: 'Pull Integration'}},
    {id: 's6_badge', parent: 's6_header', type: 'span', style_css: {padding: '0.15rem 0.4rem', background: '#4a0e2e', color: '#f9a8d4', borderRadius: '0.2rem', fontSize: '0.6rem', fontFamily: 'monospace', border: '1px solid #ec489944'}, props: {children: 'pull + modify'}},
    {id: 's6_desc', parent: 's6', type: 'p', style_css: {color: '#a1a1aa', fontSize: '0.78rem', marginBottom: '0.75rem', lineHeight: '1.5'}, props: {children: 'modify can act on nodes pulled from entity pool. The card below is pulled from entity pool, modifier overrides its title content via override mode.'}},
    {id: 's6_demo', parent: 's6', type: 'div', style_css: {display: 'flex', flexDirection: 'column', gap: '0.5rem'}},
    {id: 'pulled_card', parent: 's6_demo', type: 'div', pull: 'comp-card'},
    {
      id: 'mod_pull', parent: 's6_demo', type: 'div',
      style_css: {padding: '0.5rem', background: '#9d174d', borderRadius: '0.25rem', color: '#fbcfe8', fontSize: '0.75rem', border: '1px solid #ec489944'},
      props: {children: 'Overridden via modify — from pink modifier'},
      modify: {target: 'pulled_card__comp-card__card_title', mode: 'override'}
    },
  ], []);

  if (!isReady) {
    return <div style={{color: '#71717a', fontSize: '0.875rem', padding: '1rem'}}>Initializing...</div>;
  }

  return <JsompView entities={entities} rootId='root' id='modify_lab' />;
};