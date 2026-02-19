import React, {useMemo, useState} from 'react';
import {jsompEnv} from "../src";
import {JsompView} from "../src/renderer/react";

export const AutoSyncTest: React.FC = () => {
  // 1. Prepare local state registry for this test
  const registry = useMemo(() => {
    const reg = jsompEnv.service!.createScope();
    reg.set('userName', {value: 'Jsomp Bob'});
    reg.set('bio', {value: 'Exploring JSOMP core magic.'});
    reg.set('userRole', {value: 'admin'});
    reg.set('isAgreed', {value: true});
    return reg;
  }, []);

  const [savedData, setSavedData] = useState<any>(null);

  // 2. Define entities utilizing Mustache + Auto-Sync
  const entities = [
    {
      id: 'sync_root',
      type: 'div',
      style_css: {
        padding: '2.5rem',
        maxWidth: '500px',
        width: '100%',
        background: '#18181b',
        borderRadius: '0.5rem',
        border: '1px solid #27272a'
      }
    },
    {
      id: 'header',
      type: 'h2',
      parent: 'sync_root',
      style_css: {marginBottom: '2rem', color: '#fafafa', fontSize: '1.25rem', fontWeight: '600', letterSpacing: '-0.025em'},
      props: {children: 'Auto-Sync Standard Lab'}
    },

    // --- SECTION: Input Sync ---
    {
      id: 'field_group_1',
      type: 'div',
      parent: 'sync_root',
      style_css: {marginBottom: '1.5rem'}
    },
    {
      id: 'label_1',
      type: 'label',
      parent: 'field_group_1',
      style_css: {display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem'},
      props: {children: 'User Name (Two-way Binding)'}
    },
    {
      id: 'input_name',
      type: 'input',
      parent: 'field_group_1',
      style_css: {
        width: '100%',
        padding: '0.5rem 0.75rem',
        background: '#09090b',
        border: '1px solid #27272a',
        borderRadius: '0.25rem',
        color: '#fafafa',
        fontSize: '0.875rem',
        outline: 'none'
      },
      props: {
        value: '{{userName}}',
        placeholder: 'Enter name...'
      }
    },
    {
      id: 'preview_name',
      type: 'p',
      parent: 'field_group_1',
      style_css: {marginTop: '0.5rem', fontSize: '0.75rem', color: '#a1a1aa'},
      props: {children: 'Current: {{userName}}'}
    },

    // --- SECTION: Select Sync ---
    {
      id: 'field_group_2',
      type: 'div',
      parent: 'sync_root',
      style_css: {marginBottom: '1.5rem'}
    },
    {
      id: 'label_2',
      type: 'label',
      parent: 'field_group_2',
      style_css: {display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.4rem'},
      props: {children: 'Account Role'}
    },
    {
      id: 'select_role',
      type: 'select',
      parent: 'field_group_2',
      style_css: {
        width: '100%',
        padding: '0.5rem 0.75rem',
        background: '#09090b',
        border: '1px solid #27272a',
        borderRadius: '0.25rem',
        color: '#fafafa',
        fontSize: '0.875rem'
      },
      props: {value: '{{userRole}}'}
    },
    {id: 'opt1', type: 'option', parent: 'select_role', props: {value: 'user', children: 'Standard User'}},
    {id: 'opt2', type: 'option', parent: 'select_role', props: {value: 'editor', children: 'Content Editor'}},
    {id: 'opt3', type: 'option', parent: 'select_role', props: {value: 'admin', children: 'Administrator'}},

    {
      id: 'preview_role',
      type: 'div',
      parent: 'field_group_2',
      style_tw: ['mt-2', 'p-2', 'bg-zinc-900', 'rounded', 'text-[10px]', 'border', 'border-zinc-800', 'text-zinc-400', 'uppercase', 'tracking-wider'],
      props: {children: 'Role Badge: {{userRole}}'}
    },

    // --- SECTION: Checkbox Sync ---
    {
      id: 'field_group_3',
      type: 'div',
      parent: 'sync_root',
      style_css: {marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem'}
    },
    {
      id: 'check_agreed',
      type: 'input',
      parent: 'field_group_3',
      props: {type: 'checkbox', checked: '{{isAgreed}}'}
    },
    {
      id: 'label_check',
      type: 'label',
      parent: 'field_group_3',
      style_css: {fontSize: '0.8125rem', color: '#a1a1aa', cursor: 'pointer'},
      props: {children: 'I understand the gravity of these changes.'}
    },

    // --- ACTION ---
    {
      id: 'submit_btn',
      type: 'button',
      parent: 'sync_root',
      style_tw: ['w-full', 'py-2', 'rounded', 'font-medium', 'text-sm', 'transition-colors', 'bg-zinc-50', 'hover:bg-zinc-200', 'text-zinc-950', 'mt-4'],
      props: {
        children: 'Save Profile ({{userName}})',
        onClick: () => {
          const data = {
            name: registry.get('userName')?.value,
            role: registry.get('userRole')?.value,
            agreed: registry.get('isAgreed')?.value,
            timestamp: new Date().toLocaleTimeString()
          };
          setSavedData(data);
        }
      }
    }
  ];

  return (
    <div style={{padding: '20px', display: 'flex', gap: '2rem', justifyContent: 'center', width: '100%', maxWidth: '900px'}}>
      <div style={{flex: 1, maxWidth: '500px'}}>
        <JsompView
          entities={entities}
          rootId="sync_root"
          scope={registry}
        />
      </div>

      {savedData && (
        <div style={{
          width: '300px',
          padding: '1.5rem',
          background: '#18181b',
          borderRadius: '0.5rem',
          border: '1px solid #27272a',
          alignSelf: 'start',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <h4 style={{margin: '0 0 1rem 0', color: '#71717a', fontSize: '0.625rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Saved Profile Data</h4>
          <pre style={{
            margin: 0,
            fontSize: '0.75rem',
            color: '#a1a1aa',
            whiteSpace: 'pre-wrap',
            fontFamily: 'monospace',
            lineHeight: '1.5'
          }}>
            {JSON.stringify(savedData, null, 2)}
          </pre>
          <div style={{marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #27272a', fontSize: '0.625rem', color: '#10b981', fontFamily: 'monospace'}}>
            ✓ DISPATCHED TO MOCK SERVER
          </div>
        </div>
      )}
    </div>
  );
};
