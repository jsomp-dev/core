import React, {useEffect, useState} from 'react';
import {jsompEnv} from "@jsomp/core";
import {JsompView} from "@jsomp/core/react";

export const EntityPoolTest: React.FC = () => {
  const [scenario, setScenario] = useState<'inheritance' | 'root_pulling' | 'conflict'>('inheritance');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const jsomp = jsompEnv.service;

      // 1. Register base templates
      jsomp.entities.register('tpl', [
        {
          id: 'card',
          type: 'div',
          style_css: {
            padding: '1.5rem',
            background: '#18181b',
            borderRadius: '0.75rem',
            border: '1px solid #27272a',
            marginBottom: '1rem'
          }
        },
        {
          id: 'btn',
          type: 'button',
          style_tw: ['px-4', 'py-2', 'rounded-md', 'font-medium', 'transition-colors'],
          style_css: {
            cursor: 'pointer'
          }
        }
      ], {conflictMode: 'override'});

      // 2. Register a whole fragment (Component)
      jsomp.entities.register('comp-profile', [
        {
          id: 'container',
          type: 'div',
          style_css: {
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            padding: '1rem',
            background: '#27272a',
            borderRadius: '0.5rem'
          }
        },
        {
          id: 'avatar',
          parent: 'container',
          type: 'div',
          style_css: {
            width: '3rem',
            height: '3rem',
            borderRadius: '50%',
            background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)'
          }
        },
        {
          id: 'info',
          parent: 'container',
          type: 'div'
        },
        {
          id: 'name',
          parent: 'info',
          type: 'div',
          style_css: {fontWeight: 'bold', color: '#fff'},
          props: {children: 'JSOMP User'}
        },
        {
          id: 'role',
          parent: 'info',
          type: 'div',
          style_css: {fontSize: '0.8rem', color: '#a1a1aa'},
          props: {children: 'Prototypal Architect'}
        }
      ], {conflictMode: 'override'});

      setIsReady(true);
    };
    init();
  }, []);

  // Scene 1: Inheritance from Pool
  const inheritanceUI = [
    {id: 'page_root', type: 'div'},
    {
      id: 'my_card',
      inherit: 'tpl.card',
      parent: 'page_root',
      style_css: {borderLeft: '4px solid #3b82f6'}
    },
    {
      id: 'card_title',
      type: 'h3',
      parent: 'my_card',
      props: {children: 'Inherited Card'},
      style_css: {color: '#fff', marginBottom: '1rem'}
    },
    {
      id: 'action_btn',
      inherit: 'tpl.btn',
      parent: 'my_card',
      style_tw: ['bg-blue-600', 'text-white', 'hover:bg-blue-700'],
      props: {children: 'Confirm'}
    }
  ];

  if (!isReady) {
    return <div style={{color: '#71717a', fontSize: '0.875rem', padding: '1rem'}}>Initializing Entity Pool...</div>;
  }

  return (
    <div style={{width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: '#18181b', padding: '0.5rem', borderRadius: '0.5rem'}}>
        <button
          onClick={() => setScenario('inheritance')}
          style={{flex: 1, padding: '0.5rem', background: scenario === 'inheritance' ? '#27272a' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '0.25rem'}}
        >
          Inherit Template
        </button>
        <button
          onClick={() => setScenario('root_pulling')}
          style={{flex: 1, padding: '0.5rem', background: scenario === 'root_pulling' ? '#27272a' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '0.25rem'}}
        >
          Root from Pool
        </button>
        <button
          onClick={() => setScenario('conflict')}
          style={{flex: 1, padding: '0.5rem', background: scenario === 'conflict' ? '#27272a' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '0.25rem'}}
        >
          Conflict Check
        </button>
      </div>

      <div style={{minHeight: '300px', background: '#09090b', padding: '1rem', border: '1px solid #27272a', borderRadius: '0.5rem'}}>
        {scenario === 'inheritance' && (
          <div>
            <div style={{fontSize: '0.8rem', color: '#71717a', marginBottom: '1rem'}}>
              Nodes inherit styles from <code>tpl.card</code> and <code>tpl.btn</code> in the global pool.
            </div>
            <JsompView entities={inheritanceUI} rootId="page_root" id="entity_pool_inheritance" />
          </div>
        )}

        {scenario === 'root_pulling' && (
          <div>
            <div style={{fontSize: '0.8rem', color: '#71717a', marginBottom: '1rem'}}>
              The primary root is `comp.profile.container` which resides entirely in the pool.
            </div>
            <JsompView entities={[]} rootId="comp-profile.container" id="entity_pool_root_pulling" />
          </div>
        )}

        {scenario === 'conflict' && (
          <div style={{color: '#a1a1aa', fontSize: '0.9rem'}}>
            <p>Check console logs for warnings/errors.</p>
            <button
              style={{padding: '0.5rem 1rem', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '0.25rem', cursor: 'pointer'}}
              onClick={() => {
                try {
                  jsompEnv.service.entities.register('tpl', [{id: 'card', type: 'any'}], {conflictMode: 'error'});
                } catch (e: any) {
                  alert('Catch Expected Error: ' + e.message);
                }
              }}
            >
              Trigger Error (Conflict)
            </button>
            <div style={{marginTop: '1rem'}}>
              <button
                style={{padding: '0.5rem 1rem', background: '#eab308', color: '#000', border: 'none', borderRadius: '0.25rem', cursor: 'pointer'}}
                onClick={() => {
                  jsompEnv.service.entities.register('tpl', [{id: 'card', type: 'div'}], {conflictMode: 'warn'});
                  alert('Conflict Warning printed to console.');
                }}
              >
                Trigger Warning
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
