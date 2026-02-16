import React, {useEffect, useState} from 'react';
import {setup, JsompPage, jsomp, HtmlRegistry} from '@jsomp/core';
import {LayoutTest} from './LayoutTest';

const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [currentTab, setCurrentTab] = useState<'basic' | 'layout'>('basic');
  const [entities] = useState<any[]>([
    {
      id: 'app_root',
      type: 'div',
      style_css: {
        padding: '2rem',
        maxWidth: '800px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '1rem',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        maxHeight: '60vh',
        height: '60vh'
      }
    },
    {
      id: 'title',
      type: 'h1',
      parent: 'app_root',
      style_css: {
        fontSize: '1.8rem',
        marginBottom: '0.5rem',
        background: 'linear-gradient(to right, #60a5fa, #a855f7)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        fontWeight: 'bold',
        textAlign: 'center'
      },
      props: {
        children: 'JSOMP Core Laboratory'
      }
    },
    {
      id: 'description',
      type: 'p',
      parent: 'app_root',
      style_css: {
        color: '#94a3b8',
        fontSize: '1rem',
        lineHeight: '1.4',
        marginBottom: '1.5rem',
        textAlign: 'center'
      },
      props: {
        children: 'Testing the JSOMP engine in a zero-dependency environment.'
      }
    },
    {
      id: 'status_card',
      type: 'div',
      parent: 'app_root',
      style_css: {
        padding: '1rem',
        background: '#1e293b',
        borderRadius: '0.5rem',
        borderLeft: '4px solid #3b82f6',
        marginBottom: '1.5rem'
      }
    },
    {
      id: 'status_text',
      type: 'code',
      parent: 'status_card',
      style_css: {
        color: '#38bdf8',
        fontFamily: 'monospace',
        fontSize: '0.9rem'
      },
      props: {
        children: 'Status: Operational'
      }
    },
    {
      id: 'action_button',
      type: 'button',
      parent: 'app_root',
      style_css: {
        display: 'block',
        margin: '0 auto',
        padding: '0.6rem 1.2rem',
        background: '#3b82f6',
        color: 'white',
        border: 'none',
        borderRadius: '0.5rem',
        cursor: 'pointer',
        fontWeight: '600'
      },
      props: {
        children: 'Trigger Test Action',
        onClick: () => alert('JSOMP Interaction Success!')
      }
    },
    {
      id: 'tailwind_test',
      type: 'div',
      parent: 'app_root',
      style_tw: [
        'mt-6',
        'p-4',
        'rounded-lg',
        'bg-linear-to-r',
        'from-pink-500',
        'to-orange-400',
        'text-white',
        'font-bold',
        'text-center',
        'shadow-lg',
        'hover:scale-105',
        'transition-transform',
        'cursor-pointer'
      ],
      props: {
        children: 'Tailwind V4 Active! (Click me)',
        onClick: () => alert('Tailwind-styled element clicked!')
      }
    }
  ]);

  useEffect(() => {
    const init = async () => {
      // 1. Wait for core plugins to load
      await setup();

      // 2. Register native HTML elements
      HtmlRegistry.registerAll(jsomp.componentRegistry);

      setIsReady(true);
    };
    init();
  }, []);

  if (!isReady) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        color: '#60a5fa',
        background: '#0f172a'
      }}>
        Initializing...
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#0f172a',
      color: 'white',
      padding: '1rem',
      boxSizing: 'border-box',
      overflow: 'auto'
    }}>
      {/* Navigation Switcher */}
      <nav style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        justifyContent: 'center',
        padding: '0.5rem',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '0.75rem',
        width: 'fit-content',
        margin: '0 auto 2rem'
      }}>
        <button
          onClick={() => setCurrentTab('basic')}
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '0.5rem',
            background: currentTab === 'basic' ? '#3b82f6' : 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          Basic Lab
        </button>
        <button
          onClick={() => setCurrentTab('layout')}
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '0.5rem',
            background: currentTab === 'layout' ? '#3b82f6' : 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'all 0.2s'
          }}
        >
          Path Management
        </button>
      </nav>

      {/* Main View Container */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: currentTab === 'basic' ? 'center' : 'flex-start'
      }}>
        {currentTab === 'basic' ? (
          <JsompPage entities={entities} rootId='app_root' />
        ) : (
          <LayoutTest />
        )}
      </main>

      <div style={{
        marginTop: '1.5rem',
        textAlign: 'center',
        color: '#475569',
        fontSize: '0.75rem',
        opacity: 0.8,
        paddingBottom: '1rem'
      }}>
        Running on <strong>Vite</strong> Playground (Isolated)
      </div>
    </div>
  );
};

export default App;
