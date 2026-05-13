import {JsompView} from "@jsomp/core/react";
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';

export const MountedTest: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const pendingLogsRef = useRef<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 19)]);
  }, []);

  useEffect(() => {
    if (pendingLogsRef.current.length > 0) {
      const msgs = pendingLogsRef.current.splice(0);
      setLogs(prev => {
        const entries = msgs.map(msg => `[${new Date().toLocaleTimeString()}] ${msg}`);
        return [...entries, ...prev].slice(0, 20);
      });
    }
  });

  const entities = useMemo(() => [
    // ===== TEMPLATES =====
    {
      id: 'tpl_section',
      type: 'div',
      style_css: {
        marginBottom: '1.5rem',
        padding: '1rem',
        background: '#18181b',
        borderRadius: '0.5rem',
        border: '1px solid #27272a'
      }
    },
    {
      id: 'tpl_section_title',
      type: 'div',
      style_css: {
        fontSize: '0.75rem',
        color: '#71717a',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '1rem',
        fontWeight: 'bold'
      }
    },
    {
      id: 'tpl_badge',
      type: 'span',
      style_css: {
        display: 'inline-block',
        padding: '0.2rem 0.5rem',
        borderRadius: '0.25rem',
        fontSize: '0.65rem',
        fontWeight: 'bold',
        fontFamily: 'monospace'
      }
    },
    {
      id: 'tpl_card',
      type: 'div',
      style_css: {
        padding: '0.75rem',
        background: '#09090b',
        borderRadius: '0.375rem',
        border: '1px solid #27272a',
        marginBottom: '0.5rem'
      }
    },

    // ===== ROOT =====
    {
      id: 'mounted_root',
      type: 'div',
      style_css: {
        padding: '2rem',
        maxWidth: '700px',
        width: '100%',
        background: '#09090b',
        borderRadius: '0.75rem',
        border: '1px solid #27272a'
      }
    },
    {
      id: 'title',
      type: 'h2',
      parent: 'mounted_root',
      style_css: {marginBottom: '0.25rem', color: '#fafafa', fontSize: '1.25rem', fontWeight: 'bold'},
      props: {children: 'Mounted Field Lab'}
    },
    {
      id: 'subtitle',
      type: 'p',
      parent: 'mounted_root',
      style_css: {margin: '0 0 '},
      props: {children: 'Testing mounted={true|false|Mustache} with subtree cascade & \'jsomp:mount\' lifecycle'}
    },

    // ===== SCENARIO 1: Static mounted:false =====
    {
      id: 'sec1',
      inherit: 'tpl_section',
      parent: 'mounted_root'
    },
    {
      id: 'sec1_title',
      inherit: 'tpl_section_title',
      parent: 'sec1',
      props: {children: '1. Static mounted:false (Always Hidden)'}
    },
    {
      id: 'sec1_desc',
      type: 'p',
      parent: 'sec1',
      style_css: {fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.75rem'},
      props: {children: 'This node has mounted:false — it should never appear in the DOM.'}
    },
    {
      id: 'static_hidden',
      type: 'div',
      parent: 'sec1',
      mounted: false,
      style_css: {padding: '1rem', background: '#7f1d1d', borderRadius: '0.25rem', color: '#fca5a5'},
      props: {children: 'I should NOT be visible (mounted:false)'}
    },
    {
      id: 'static_hidden_child',
      type: 'div',
      parent: 'static_hidden',
      style_css: {marginTop: '0.5rem', padding: '0.5rem', background: '#991b1b', borderRadius: '0.25rem'},
      props: {children: 'Child of hidden node — also invisible'}
    },
    {
      id: 'static_desc',
      type: 'p',
      parent: 'sec1',
      style_css: {fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.75rem'},
      props: {children: 'This node has mounted:undefined — it should be rendered with normal logic in the DOM.'}
    },
    {
      id: 'static_visible',
      type: 'div',
      parent: 'sec1',
      style_css: {padding: '0.75rem', background: '#14532d', borderRadius: '0.25rem', color: '#86efac', fontSize: '0.8rem'},
      props: {children: 'I am visible (mounted:undefined, normal render)'}
    },

    // ===== SCENARIO 2: Reactive Mustache Binding =====
    {
      id: 'sec2',
      inherit: 'tpl_section',
      parent: 'mounted_root'
    },
    {
      id: 'sec2_title',
      inherit: 'tpl_section_title',
      parent: 'sec2',
      props: {children: '2. Reactive Mustache Binding'}
    },
    {
      id: 'sec2_desc',
      type: 'p',
      parent: 'sec2',
      style_css: {fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.75rem'},
      props: {children: 'Toggle the atom to mount/unmount the panel below. \'jsomp:mount\' fires on each re-mount.'}
    },
    {
      id: 'toggle_row',
      type: 'div',
      parent: 'sec2',
      style_css: {display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem'}
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
        fontSize: '0.8rem'
      },
      actions: {'mounted.togglePanel': ['onClick']},
      props: {children: 'Toggle Panel (mounted: {{showPanel}})'}
    },
    {
      id: 'panel_status',
      inherit: 'tpl_badge',
      parent: 'toggle_row',
      style_css: {
        background: {
          opType: 'if',
          target: '{{showPanel}}',
          then: '#14532d',
          else: '#7f1d1d'
        },
        color: {
          opType: 'if',
          target: '{{showPanel}}',
          then: '#86efac',
          else: '#fca5a5'
        }
      },
      props: {
        children: {
          opType: 'if',
          target: '{{showPanel}}',
          then: 'MOUNTED',
          else: 'UNMOUNTED'
        }
      }
    },
    {
      id: 'reactive_panel',
      type: 'div',
      parent: 'sec2',
      mounted: '{{showPanel}}',
      style_css: {
        padding: '1rem',
        background: '#1e3a5f',
        borderRadius: '0.375rem',
        border: '1px solid #1d4ed8',
        transition: 'all 0.2s'
      },
      // actions: {
      //   execute_when_mounted: ['jsomp:mount']
      // },
      props: {children: '🎯 Reactive Panel — I appear/disappear with mounted binding!'}
    },
    {
      id: 'reactive_panel_child',
      type: 'div',
      parent: 'reactive_panel',
      style_css: {marginTop: '0.5rem', padding: '0.5rem', background: '#1e3a5f', borderRadius: '0.25rem', fontSize: '0.75rem', color: '#93c5fd'},
      props: {children: 'Child node — also unmounted when parent is hidden'}
    },

    // ===== SCENARIO 3: Subtree Cascade =====
    {
      id: 'sec3',
      inherit: 'tpl_section',
      parent: 'mounted_root'
    },
    {
      id: 'sec3_title',
      inherit: 'tpl_section_title',
      parent: 'sec3',
      props: {children: '3. Subtree Cascade (Parent Controls Children)'}
    },
    {
      id: 'sec3_desc',
      type: 'p',
      parent: 'sec3',
      style_css: {fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.75rem'},
      props: {children: 'Toggling the parent unmounts/mounts the entire subtree.'}
    },
    {
      id: 'cascade_toggle_btn',
      type: 'button',
      parent: 'sec3',
      style_css: {
        padding: '0.4rem 0.8rem',
        borderRadius: '0.25rem',
        background: '#27272a',
        color: '#fafafa',
        border: '1px solid #3f3f46',
        cursor: 'pointer',
        fontSize: '0.8rem',
        marginBottom: '0.75rem'
      },
      actions: {'mounted.toggleCascade': ['onClick']},
      props: {children: 'Toggle Subtree (mounted: {{showCascade}})'}
    },
    {
      id: 'cascade_parent',
      type: 'div',
      parent: 'sec3',
      mounted: '{{showCascade}}',
      style_css: {
        padding: '1rem',
        background: '#4c1d95',
        borderRadius: '0.375rem',
        border: '1px solid #7c3aed'
      },
      // actions: {
      //   execute_when_mounted: ['jsomp:mount']
      // },
      props: {children: '📦 Cascade Parent'}
    },
    {
      id: 'cascade_child_1',
      type: 'div',
      parent: 'cascade_parent',
      style_css: {marginTop: '0.5rem', padding: '0.5rem', background: '#5b21b6', borderRadius: '0.25rem', fontSize: '0.8rem', color: '#c4b5fd'},
      props: {children: 'Child 1 — part of subtree'}
    },
    {
      id: 'cascade_child_2',
      type: 'div',
      parent: 'cascade_parent',
      style_css: {marginTop: '0.5rem', padding: '0.5rem', background: '#6d28d9', borderRadius: '0.25rem', fontSize: '0.8rem', color: '#ddd6fe'},
      props: {children: 'Child 2 — also part of subtree'}
    },
    {
      id: 'cascade_grandchild',
      type: 'div',
      parent: 'cascade_child_2',
      style_css: {marginTop: '0.5rem', padding: '0.4rem', background: '#7c3aed', borderRadius: '0.25rem', fontSize: '0.7rem', color: '#ede9fe'},
      props: {children: 'Grandchild — deep in subtree'}
    },

    // ===== SCENARIO 4: Multiple Independent Toggles =====
    {
      id: 'sec4',
      inherit: 'tpl_section',
      parent: 'mounted_root'
    },
    {
      id: 'sec4_title',
      inherit: 'tpl_section_title',
      parent: 'sec4',
      props: {children: '4. Multiple Independent Toggles'}
    },
    {
      id: 'sec4_desc',
      type: 'p',
      parent: 'sec4',
      style_css: {fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.75rem'},
      props: {children: 'Each panel independently controls its mounted state.'}
    },
    {
      id: 'multi_row',
      type: 'div',
      parent: 'sec4',
      style_css: {display: 'flex', gap: '0.75rem', flexWrap: 'wrap'}
    },
    {
      id: 'panel_a_btn',
      type: 'button',
      parent: 'multi_row',
      style_css: {
        padding: '0.4rem 0.8rem',
        borderRadius: '0.25rem',
        background: '#27272a',
        color: '#fafafa',
        border: '1px solid #3f3f46',
        cursor: 'pointer',
        fontSize: '0.75rem'
      },
      actions: {'mounted.toggleA': ['onClick']},
      props: {children: 'Toggle A ({{showA}})'}
    },
    {
      id: 'panel_b_btn',
      type: 'button',
      parent: 'multi_row',
      style_css: {
        padding: '0.4rem 0.8rem',
        borderRadius: '0.25rem',
        background: '#27272a',
        color: '#fafafa',
        border: '1px solid #3f3f46',
        cursor: 'pointer',
        fontSize: '0.75rem'
      },
      actions: {'mounted.toggleB': ['onClick']},
      props: {children: 'Toggle B ({{showB}})'}
    },
    {
      id: 'panel_c_btn',
      type: 'button',
      parent: 'multi_row',
      style_css: {
        padding: '0.4rem 0.8rem',
        borderRadius: '0.25rem',
        background: '#27272a',
        color: '#fafafa',
        border: '1px solid #3f3f46',
        cursor: 'pointer',
        fontSize: '0.75rem'
      },
      actions: {'mounted.toggleC': ['onClick']},
      props: {children: 'Toggle C ({{showC}})'}
    },
    {
      id: 'panel_a',
      type: 'div',
      parent: 'sec4',
      mounted: '{{showA}}',
      style_css: {padding: '0.75rem', background: '#166534', borderRadius: '0.25rem', color: '#86efac', fontSize: '0.8rem', marginTop: '0.5rem'},
      props: {children: 'Panel A — mounted: {{showA}}'}
    },
    {
      id: 'panel_b',
      type: 'div',
      parent: 'sec4',
      mounted: '{{showB}}',
      style_css: {padding: '0.75rem', background: '#1e40af', borderRadius: '0.25rem', color: '#93c5fd', fontSize: '0.8rem', marginTop: '0.5rem'},
      props: {children: 'Panel B — mounted: {{showB}}'}
    },
    {
      id: 'panel_c',
      type: 'div',
      parent: 'sec4',
      mounted: '{{showC}}',
      style_css: {padding: '0.75rem', background: '#6b21a8', borderRadius: '0.25rem', color: '#c4b5fd', fontSize: '0.8rem', marginTop: '0.5rem'},
      props: {children: 'Panel C — mounted: {{showC}}'}
    },

    // ===== SCENARIO 5: 'jsomp:mount' Lifecycle Logging =====
    {
      id: 'sec5',
      inherit: 'tpl_section',
      parent: 'mounted_root'
    },
    {
      id: 'sec5_title',
      inherit: 'tpl_section_title',
      parent: 'sec5',
      props: {children: '5. \'jsomp:mount\' Lifecycle Events'}
    },
    {
      id: 'sec5_desc',
      type: 'p',
      parent: 'sec5',
      style_css: {fontSize: '0.8rem', color: '#a1a1aa', marginBottom: '0.75rem'},
      props: {children: 'Each re-mount triggers \'jsomp:mount\'. Check the log panel below.'}
    },
    {
      id: 'lifecycle_btn',
      type: 'button',
      parent: 'sec5',
      style_css: {
        padding: '0.4rem 0.8rem',
        borderRadius: '0.25rem',
        background: '#27272a',
        color: '#fafafa',
        border: '1px solid #3f3f46',
        cursor: 'pointer',
        fontSize: '0.8rem'
      },
      actions: {'mounted.toggleLifecycle': ['onClick']},
      props: {children: 'Toggle Lifecycle Node (mounted: {{showLifecycle}})'}
    },
    {
      id: 'lifecycle_node',
      type: 'div',
      parent: 'sec5',
      mounted: '{{showLifecycle}}',
      style_css: {
        padding: '0.75rem',
        background: '#78350f',
        borderRadius: '0.25rem',
        border: '1px solid #d97706',
        color: '#fde68a',
        fontSize: '0.8rem',
        marginTop: '0.5rem'
      },
      // actions: {
      //   execute_when_mounted: ['jsomp:mount']
      // },
      props: {children: '🔄 Lifecycle Node — \'jsomp:mount\' fires each mount'}
    }
  ], []);

  const handleBeforeMount = useCallback((jsomp: any) => {
    const reg = jsomp.atoms;
    reg.set('showPanel', false);
    reg.set('showCascade', false);
    reg.set('showA', false);
    reg.set('showB', false);
    reg.set('showC', false);
    reg.set('showLifecycle', false);

    const actions = jsomp.actions;
    actions.register('mounted.togglePanel', {
      require: {atoms: {showPanel: 'showPanel'}},
      handler: ({atoms}: any) => {atoms.showPanel = !atoms.showPanel;}
    });
    actions.register('mounted.toggleCascade', {
      require: {atoms: {showCascade: 'showCascade'}},
      handler: ({atoms}: any) => {atoms.showCascade = !atoms.showCascade;}
    });
    actions.register('mounted.toggleA', {
      require: {atoms: {showA: 'showA'}},
      handler: ({atoms}: any) => {atoms.showA = !atoms.showA;}
    });
    actions.register('mounted.toggleB', {
      require: {atoms: {showB: 'showB'}},
      handler: ({atoms}: any) => {atoms.showB = !atoms.showB;}
    });
    actions.register('mounted.toggleC', {
      require: {atoms: {showC: 'showC'}},
      handler: ({atoms}: any) => {atoms.showC = !atoms.showC;}
    });
    actions.register('mounted.toggleLifecycle', {
      require: {atoms: {showLifecycle: 'showLifecycle'}},
      handler: ({atoms}: any) => {atoms.showLifecycle = !atoms.showLifecycle;}
    });

    // TODO: Register 'jsomp:mount' event handler
    // actions.register('execute_when_mounted', {
    //   handler: ({event, contextPath}: any) => {
    //     addLog(`'jsomp:mount' fired — path: ${contextPath}`);
    //   }
    // });

    pendingLogsRef.current.push('MountedTest initialized');
  }, [addLog]);

  return (
    <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem'}}>
      <JsompView
        key={'MountedTestView'}
        entities={entities}
        rootId="mounted_root"
        id="mounted_test"
        beforeMount={handleBeforeMount}
      />

      <div style={{
        width: '100%',
        maxWidth: '700px',
        background: '#09090b',
        border: '1px solid #27272a',
        borderRadius: '0.5rem',
        padding: '1rem',
        fontSize: '0.75rem',
        fontFamily: 'monospace'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#71717a',
          marginBottom: '0.5rem',
          borderBottom: '1px solid #27272a',
          paddingBottom: '0.4rem'
        }}>
          <span>Event Log</span>
          <button
            onClick={() => setLogs([])}
            style={{
              background: 'transparent',
              border: '1px solid #3f3f46',
              color: '#71717a',
              borderRadius: '0.25rem',
              padding: '0.15rem 0.5rem',
              cursor: 'pointer',
              fontSize: '0.65rem'
            }}
          >
            Clear
          </button>
        </div>
        {logs.map((log, i) => (
          <div key={i} style={{
            color: log.includes('jsomp:mount') ? '#4ade80' : '#a1a1aa',
            marginBottom: '0.15rem',
            lineHeight: '1.4'
          }}>
            {log}
          </div>
        ))}
        {logs.length === 0 && <div style={{color: '#3f3f46'}}>No events yet...</div>}
      </div>
    </div>
  );
};