import React, {useMemo} from 'react';
import {jsompEnv, JsompPage} from '@jsomp/core';

export const AutoSyncTest: React.FC = () => {
  // 1. Prepare local state registry for this test
  const registry = useMemo(() => {
    const reg = jsompEnv.service!.createScope();
    reg.set('userName', {value: 'Wise Wizard'});
    reg.set('bio', {value: 'Exploring JSOMP core magic.'});
    reg.set('userRole', {value: 'admin'});
    reg.set('isAgreed', {value: true});
    return reg;
  }, []);

  // 2. Define entities utilizing Mustache + Auto-Sync
  const entities = [
    {
      id: 'sync_root',
      type: 'div',
      style_css: {
        padding: '2rem',
        maxWidth: '600px',
        background: '#1e293b',
        borderRadius: '1rem',
        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)'
      }
    },
    {
      id: 'header',
      type: 'h2',
      parent: 'sync_root',
      style_css: {marginBottom: '1.5rem', color: '#60a5fa'},
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
        padding: '0.6rem',
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '0.4rem',
        color: 'white',
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
      style_css: {marginTop: '0.4rem', fontSize: '0.9rem', color: '#38bdf8'},
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
        padding: '0.6rem',
        background: '#0f172a',
        border: '1px solid #334155',
        borderRadius: '0.4rem',
        color: 'white'
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
      style_tw: ['mt-2', 'p-2', 'bg-blue-900/40', 'rounded', 'text-xs', 'border', 'border-blue-500/30'],
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
      style_css: {fontSize: '0.9rem', color: '#cbd5e1'},
      props: {children: 'I understand the gravity of these changes.'}
    },

    // --- ACTION ---
    {
      id: 'submit_btn',
      type: 'button',
      parent: 'sync_root',
      style_tw: ['w-full', 'py-2', 'rounded-lg', 'font-bold', 'transition-all', 'bg-blue-600', 'hover:bg-blue-700', 'text-white', 'mt-4'],
      props: {
        children: 'Save Profile ({{userName}})',
        onClick: () => {
          const data = {
            name: registry.get('userName')?.value,
            role: registry.get('userRole')?.value,
            agreed: registry.get('isAgreed')?.value
          };
          alert(`Saving Data:\n${JSON.stringify(data, null, 2)}`);
        }
      }
    }
  ];

  return (
    <div style={{padding: '20px', display: 'flex', justifyContent: 'center', width: '100%'}}>
      <JsompPage
        entities={entities}
        rootId="sync_root"
        scope={registry}
      />
    </div>
  );
};
