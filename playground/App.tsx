import React, {useEffect, useState} from 'react';
import {LayoutTest} from './LayoutTest';
import {SlotTest} from './SlotTest';
import {AutoSyncTest} from './AutoSyncTest';
import {PerformanceTest} from './PerformanceTest';
import {StreamTest} from './StreamTest';
import {HtmlRegistry, setupJsomp} from "@jsomp/core";
import {JsompView} from "@jsomp/core/react";


const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [currentTab, setCurrentTab] = useState<'basic' | 'layout' | 'slot' | 'sync' | 'perf' | 'stream'>('basic');
  const [entities] = useState<any[]>([
    {
      id: 'app_root',
      type: 'div',
      style_css: {
        padding: '2rem',
        maxWidth: '800px',
        margin: '0 auto',
        background: '#09090b',
        borderRadius: '0.5rem',
        border: '1px solid #27272a',
        boxShadow: 'none',
        maxHeight: '60vh',
        height: '60vh'
      }
    },
    {
      id: 'title',
      type: 'h1',
      parent: 'app_root',
      style_css: {
        fontSize: '1.5rem',
        marginBottom: '0.5rem',
        color: '#fafafa',
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: '-0.025em'
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
        color: '#a1a1aa',
        fontSize: '0.875rem',
        lineHeight: '1.5',
        marginBottom: '2rem',
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
        background: '#18181b',
        borderRadius: '0.5rem',
        border: '1px solid #27272a',
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
        padding: '0.5rem 1rem',
        background: '#fafafa',
        color: '#09090b',
        border: 'none',
        borderRadius: '0.25rem',
        cursor: 'pointer',
        fontWeight: '500',
        fontSize: '0.875rem',
        transition: 'opacity 0.2s'
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
      const jsomp = await setupJsomp();

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
        color: '#fafafa',
        background: '#09090b',
        fontSize: '0.875rem'
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
      background: '#09090b',
      color: '#fafafa',
      padding: '1.5rem',
      boxSizing: 'border-box',
      overflow: 'auto',
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* Navigation Switcher */}
      <nav style={{
        display: 'flex',
        gap: '0.25rem',
        marginBottom: '2rem',
        justifyContent: 'center',
        padding: '0.25rem',
        background: '#18181b',
        borderRadius: '0.5rem',
        width: 'fit-content',
        margin: '0 auto 2rem',
        border: '1px solid #27272a'
      }}>
        <button
          onClick={() => setCurrentTab('basic')}
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '0.25rem',
            background: currentTab === 'basic' ? '#27272a' : 'transparent',
            border: 'none',
            color: currentTab === 'basic' ? '#fafafa' : '#a1a1aa',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.875rem',
            transition: 'all 0.2s'
          }}
        >
          Basic Lab
        </button>
        <button
          onClick={() => setCurrentTab('layout')}
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '0.25rem',
            background: currentTab === 'layout' ? '#27272a' : 'transparent',
            border: 'none',
            color: currentTab === 'layout' ? '#fafafa' : '#a1a1aa',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.875rem',
            transition: 'all 0.2s'
          }}
        >
          Path Management
        </button>
        <button
          onClick={() => setCurrentTab('slot')}
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '0.25rem',
            background: currentTab === 'slot' ? '#27272a' : 'transparent',
            border: 'none',
            color: currentTab === 'slot' ? '#fafafa' : '#a1a1aa',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.875rem',
            transition: 'all 0.2s'
          }}
        >
          Slot Lab
        </button>
        <button
          onClick={() => setCurrentTab('sync')}
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '0.25rem',
            background: currentTab === 'sync' ? '#27272a' : 'transparent',
            border: 'none',
            color: currentTab === 'sync' ? '#fafafa' : '#a1a1aa',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.875rem',
            transition: 'all 0.2s'
          }}
        >
          Auto-Sync Lab
        </button>
        <button
          onClick={() => setCurrentTab('perf')}
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '0.25rem',
            background: currentTab === 'perf' ? '#27272a' : 'transparent',
            border: 'none',
            color: currentTab === 'perf' ? '#fafafa' : '#a1a1aa',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.875rem',
            transition: 'all 0.2s'
          }}
        >
          Performance Lab
        </button>
        <button
          onClick={() => setCurrentTab('stream')}
          style={{
            padding: '0.4rem 1rem',
            borderRadius: '0.25rem',
            background: currentTab === 'stream' ? '#27272a' : 'transparent',
            border: 'none',
            color: currentTab === 'stream' ? '#fafafa' : '#a1a1aa',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.875rem',
            transition: 'all 0.2s'
          }}
        >
          Stream Lab
        </button>
      </nav>

      {/* Main View Container */}
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: (currentTab === 'basic' || currentTab === 'perf') ? 'center' : 'flex-start'
      }}>
        {currentTab === 'basic' ? (
          <JsompView entities={entities} rootId='app_root' />
        ) : currentTab === 'layout' ? (
          <LayoutTest />
        ) : currentTab === 'slot' ? (
          <SlotTest />
        ) : currentTab === 'sync' ? (
          <AutoSyncTest />
        ) : currentTab === 'perf' ? (
          <PerformanceTest />
        ) : (
          <StreamTest />
        )}
      </main>

      <div style={{
        marginTop: '1.5rem',
        textAlign: 'center',
        color: '#71717a',
        fontSize: '0.75rem',
        paddingBottom: '1rem'
      }}>
        Running on <strong>Vite</strong> Playground (Isolated)
      </div>
    </div>
  );
};

export default App;
