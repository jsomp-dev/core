import React, {useEffect, useState} from 'react';
import {jsompEnv} from "@jsomp/core";
import {JsompView} from "@jsomp/core/react";

export const EntityPoolPullTest: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [scenario, setScenario] = useState<'namespace' | 'subtree' | 'multi-parent'>('namespace');

  useEffect(() => {
    const init = async () => {
      const jsomp = jsompEnv.service;

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

      jsomp.entities.register('comp-card', [
        {
          id: 'root',
          type: 'div',
          style_css: {
            padding: '1.5rem',
            background: '#18181b',
            borderRadius: '0.75rem',
            border: '1px solid #27272a'
          }
        },
        {
          id: 'title',
          parent: 'root',
          type: 'h3',
          style_css: {color: '#fff', marginBottom: '0.75rem'},
          props: {children: 'Pulled Card'}
        },
        {
          id: 'body',
          parent: 'root',
          type: 'p',
          style_css: {color: '#a1a1aa', fontSize: '0.875rem'},
          props: {children: 'This entire subtree was pulled from the entity pool.'}
        }
      ], {conflictMode: 'override'});

      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady) {
    return <div style={{color: '#71717a', fontSize: '0.875rem', padding: '1rem'}}>Initializing Entity Pool...</div>;
  }

  const namespacePullUI = [
    {id: 'page', type: 'div', style_css: {display: 'flex', flexDirection: 'column', gap: '1rem'}},
    {id: 'profile_section', type: 'div', parent: 'page', pull: 'comp-profile'},
    {id: 'card_section', type: 'div', parent: 'page', pull: 'comp-card'},
  ];

  const subtreePullUI = [
    {id: 'wrapper', type: 'div', style_css: {display: 'flex', flexDirection: 'column', gap: '1rem'}},
    {id: 'sidebar', type: 'div', parent: 'wrapper', pull: 'comp-profile.container'},
  ];

  const multiParentPullUI = [
    {id: 'layout', type: 'div', style_css: {display: 'flex', gap: '1rem'}},
    {id: 'left', type: 'div', parent: 'layout', style_css: {flex: 1}},
    {id: 'right', type: 'div', parent: 'layout', style_css: {flex: 1}},
    {id: 'shared', type: 'div', parent: ['left', 'right'], pull: 'comp-card'},
  ];

  return (
    <div style={{width: '100%', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
      <div style={{display: 'flex', gap: '0.5rem', marginBottom: '1rem', background: '#18181b', padding: '0.5rem', borderRadius: '0.5rem'}}>
        <button onClick={() => setScenario('namespace')}
          style={{flex: 1, padding: '0.5rem', background: scenario === 'namespace' ? '#27272a' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '0.25rem'}}>
          Namespace Pull
        </button>
        <button onClick={() => setScenario('subtree')}
          style={{flex: 1, padding: '0.5rem', background: scenario === 'subtree' ? '#27272a' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '0.25rem'}}>
          Subtree Pull
        </button>
        <button onClick={() => setScenario('multi-parent')}
          style={{flex: 1, padding: '0.5rem', background: scenario === 'multi-parent' ? '#27272a' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '0.25rem'}}>
          Multi-Parent
        </button>
      </div>

      <div style={{minHeight: '300px', background: '#09090b', padding: '1rem', border: '1px solid #27272a', borderRadius: '0.5rem'}}>
        {scenario === 'namespace' && (
          <div>
            <div style={{fontSize: '0.8rem', color: '#71717a', marginBottom: '1rem'}}>
              Nodes with <code>pull: "comp-profile"</code> and <code>pull: "comp-card"</code> pull entire namespace trees from the pool.
            </div>
            <JsompView entities={namespacePullUI} rootId="page" id="pull_namespace" />
          </div>
        )}

        {scenario === 'subtree' && (
          <div>
            <div style={{fontSize: '0.8rem', color: '#71717a', marginBottom: '1rem'}}>
              <code>pull: "comp-profile.container"</code> pulls a specific subtree root from the pool.
            </div>
            <JsompView entities={subtreePullUI} rootId="wrapper" id="pull_subtree" />
          </div>
        )}

        {scenario === 'multi-parent' && (
          <div>
            <div style={{fontSize: '0.8rem', color: '#71717a', marginBottom: '1rem'}}>
              A node with <code>parent: ["left", "right"]</code> and <code>pull: "comp-card"</code> duplicates the pulled tree under both parents.
            </div>
            <JsompView entities={multiParentPullUI} rootId="layout" id="pull_multi" />
          </div>
        )}
      </div>
    </div>
  );
};