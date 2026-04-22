import React, {useState} from 'react';
import {jsompEnv, HtmlRegistry} from '@jsomp/core';
import {JsompProvider, useJsomp, useJsompInstance, JsompView} from '@jsomp/core/react';

/**
 * Inner component to test useJsomp and useJsompInstance
 */
const HookTester: React.FC = () => {
  const {isReady, service} = useJsomp();
  const testInstance = useJsompInstance<HTMLDivElement>('test_node');

  return (
    <div style={{
      padding: '1.5rem',
      background: '#18181b',
      borderRadius: '0.5rem',
      border: '1px solid #27272a',
      width: '100%',
      maxWidth: '600px'
    }}>
      <h3 style={{marginTop: 0, color: '#fafafa'}}>Hook Status</h3>

      <div style={{display: 'grid', gridTemplateColumns: '120px 1fr', gap: '0.5rem', fontSize: '0.9rem'}}>
        <span style={{color: '#a1a1aa'}}>JSOMP Ready:</span>
        <span style={{color: isReady ? '#4ade80' : '#f87171'}}>{isReady ? 'Yes' : 'No'}</span>

        <span style={{color: '#a1a1aa'}}>Service:</span>
        <code style={{color: '#38bdf8'}}>{service ? 'Available' : 'Null'}</code>

        <span style={{color: '#a1a1aa'}}>Test Instance:</span>
        <code style={{color: '#fbbf24'}}>{testInstance ? `Present (${testInstance.tagName})` : 'Missing'}</code>
      </div>

      <div style={{marginTop: '1.5rem'}}>
        <JsompView
          id="test_view"
          entities={[
            {
              id: 'test_node',
              type: 'div',
              trackInstance: true,
              props: {
                children: 'I am a JSOMP node!',
                style: {
                  padding: '1rem',
                  marginTop: '1rem',
                  background: '#27272a',
                  borderRadius: '0.25rem',
                  textAlign: 'center',
                  border: testInstance ? '2px solid #fbbf24' : '1px dashed #52525b'
                }
              }
            }
          ]}
        />
      </div>
    </div>
  );
};

export const ReactHooksTest: React.FC = () => {
  const [showProvider, setShowProvider] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (msg: string) => setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 9)]);

  // Reset jsompEnv for a clean test of Provider
  const handleResetAndStart = () => {
    jsompEnv.clear();
    addLog('Environment cleared');
    setShowProvider(true);
  };

  const handleProviderMount = React.useCallback((service: any) => {
    // Re-register HTML tags because clear() wiped them
    HtmlRegistry.registerAll(service.components);
    addLog('JSOMP Ready & HTML Tags Re-registered');
  }, []);

  return (
    <div style={{width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2rem'}}>
      <div style={{textAlign: 'center'}}>
        <h2 style={{margin: '0 0 0.5rem 0'}}>React Hooks & Provider Lab</h2>
        <p style={{color: '#a1a1aa', margin: 0}}>Testing JsompProvider, useJsomp, and useJsompInstance</p>
      </div>

      {!showProvider ? (
        <div style={{padding: '2rem', background: '#18181b', borderRadius: '0.8rem', border: '1px solid #27272a', textAlign: 'center'}}>
          <p style={{marginBottom: '1.5rem', color: '#d4d4d8'}}>Click to clear global state and start Provider initialization test.</p>
          <button
            onClick={handleResetAndStart}
            style={{
              padding: '0.6rem 1.5rem',
              background: '#fafafa',
              color: '#09090b',
              border: 'none',
              borderRadius: '0.4rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Start Provider Test
          </button>
        </div>
      ) : (
        <JsompProvider
          config={{
            // Custom config for testing
          }}
          onMount={handleProviderMount}
          fallback={
            <div style={{padding: '3rem', color: '#a1a1aa', textAlign: 'center'}}>
              <div style={{marginBottom: '1rem', animation: 'pulse 2s infinite'}}>Initializing JSOMP via Provider...</div>
              <div style={{width: '200px', height: '4px', background: '#27272a', margin: '0 auto', borderRadius: '2px', overflow: 'hidden'}}>
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: '#38bdf8',
                  animation: 'shimmer 1.5s infinite linear',
                  backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.3) 50%, rgba(255,255,255,0) 100%)',
                  backgroundSize: '200% 100%'
                }} />
              </div>
            </div>
          }
        >
          <HookTester />

          <button
            onClick={() => setShowProvider(false)}
            style={{
              marginTop: '1rem',
              background: 'transparent',
              color: '#71717a',
              border: '1px solid #27272a',
              padding: '0.4rem 1rem',
              borderRadius: '0.3rem',
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            Exit Provider Mode
          </button>
        </JsompProvider>
      )}

      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}} />

      <div style={{
        width: '100%',
        maxWidth: '600px',
        background: '#09090b',
        border: '1px solid #27272a',
        borderRadius: '0.5rem',
        padding: '1rem',
        fontSize: '0.8rem',
        fontFamily: 'monospace'
      }}>
        <div style={{color: '#71717a', marginBottom: '0.5rem', borderBottom: '1px solid #27272a', paddingBottom: '0.2rem'}}>Logs</div>
        {logs.map((log, i) => (
          <div key={i} style={{
            color: log.includes('cleared') ? '#f87171' : (log.includes('Ready') ? '#4ade80' : '#a1a1aa'),
            marginBottom: '0.2rem'
          }}>
            {log}
          </div>
        ))}
        {logs.length === 0 && <div style={{color: '#3f3f46'}}>No actions yet...</div>}
      </div>
    </div>
  );
};
