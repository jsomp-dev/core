import React, {useState} from 'react';
import {JsompView} from "@jsomp/core/react";

/**
 * ShortcutTest.tsx
 * 
 * Testing Native Keyboard Shortcuts (key:xxx) and system:ignore logic.
 */
export const ShortcutTest: React.FC = () => {
  const [log, setLog] = useState<string[]>([]);
  const [focusedId, setFocusedId] = useState<string>('');

  const addLog = (msg: string) => {
    setLog(prev => [msg, ...prev].slice(0, 10));
  };

  const entities = [
    {
      id: 'test_panel',
      type: 'div',
      style_css: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        maxWidth: '600px',
        width: '100%'
      }
    },
    {
      id: 'instruction_card',
      type: 'div',
      parent: 'test_panel',
      style_css: {
        padding: '1rem',
        background: '#18181b',
        borderRadius: '0.5rem',
        border: '1px solid rgba(56, 189, 248, 0.2)',
        color: '#fafafa',
        fontSize: '0.875rem',
        marginBottom: '0.5rem'
      },
      props: {
        children: '💡 Guide: Click a card to focus it, then press keyboard shortcuts to test (e.g., Ctrl+S).'
      }
    },

    ...createTestCase('case1', 'Case 1: Standard Shortcuts', 'Focus & press [Ctrl+S] or [Esc]', '#18181b', {
      'on-save': ['key:ctrl+s'],
      'on-reset': ['key:esc']
    }),

    ...createTestCase('case2', 'Case 2: Interception (Silent)', 'Blocked: [F5] & [Click]. Try [Ctrl+F5]!', '#2d0a0a', {
      'system:ignore': ['onClick', 'key:f5'],
      'on-cheat': ['key:ctrl+f5']
    }),

    ...createTestCase('case3', 'Case 3: Power User Combo', '[Enter], [Shift+Enter], or [Meta+K]', '#064e3b', {
      'on-submit': ['key:enter'],
      'on-newline': ['key:shift+enter'],
      'on-search': ['key:meta+k', 'key:ctrl+k']
    }),
  ];

  function createTestCase(id: string, title: string, desc: string, bgColor: string, actions: any) {
    const isActive = focusedId === id;
    return [
      {
        id: id,
        parent: 'test_panel',
        type: 'div',
        style_css: {
          padding: '1.5rem',
          background: bgColor,
          borderRadius: '0.75rem',
          cursor: 'pointer',
          outline: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          position: 'relative',
          border: '2px solid',
          borderColor: isActive ? '#38bdf8' : 'transparent',
          boxShadow: isActive ? '0 0 15px rgba(56, 189, 248, 0.2)' : 'none',
          transform: isActive ? 'translateX(8px)' : 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
        },
        props: {
          tabIndex: 0,
          onFocus: () => setFocusedId(id),
          onBlur: () => setFocusedId('')
        },
        actions
      },
      {
        id: `${id}_title`,
        parent: id,
        type: 'div',
        style_css: { color: '#fafafa', fontWeight: 'bold', fontSize: '1rem', pointerEvents: 'none' },
        props: { children: title }
      },
      {
        id: `${id}_desc`,
        parent: id,
        type: 'div',
        style_css: { color: '#a1a1aa', fontSize: '0.8rem', pointerEvents: 'none' },
        props: { children: desc }
      },
      {
        id: `${id}_indicator`,
        parent: id,
        type: 'div',
        style_css: {
          position: 'absolute',
          top: '0.75rem',
          right: '0.75rem',
          fontSize: '0.6rem',
          fontWeight: 'bold',
          padding: '2px 6px',
          borderRadius: '4px',
          background: '#38bdf8',
          color: '#09090b',
          opacity: isActive ? 1 : 0,
          transform: isActive ? 'scale(1)' : 'scale(0.8)',
          transition: 'all 0.2s'
        },
        props: { children: 'FOCUS' }
      }
    ];
  }

  const beforeMount = (service: any) => {
    service.actions.register('on-save', () => addLog('Action: [Ctrl+S] Saved!'));
    service.actions.register('on-reset', () => addLog('Action: [Esc] Reset!'));
    service.actions.register('on-cheat', () => addLog('Action: [Ctrl+F5] Bypassed!'));
    service.actions.register('on-submit', () => addLog('Action: [Enter] Submitted!'));
    service.actions.register('on-newline', () => addLog('Action: [Shift+Enter] Line Break!'));
    service.actions.register('on-search', () => addLog('Action: [Meta/Ctrl+K] Searching...'));
  };

  return (
    <div style={{
      width: '100%', 
      maxWidth: '1000px', 
      margin: '0 auto', 
      display: 'grid', 
      gridTemplateColumns: '1fr 320px', 
      gap: '2.5rem',
      padding: '2rem',
      boxSizing: 'border-box',
      alignItems: 'start'
    }}>
      {/* Left: JSOMP Rendered Test Area */}
      <JsompView 
        entities={entities} 
        beforeMount={beforeMount}
      />

      {/* Right: React Log Panel (Independent from Jsomp re-renders) */}
      <div style={{
        background: '#111113',
        borderRadius: '0.75rem',
        border: '1px solid #27272a',
        padding: '1.25rem',
        minHeight: '400px',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: '2rem'
      }}>
        <h3 style={{ marginTop: 0, fontSize: '1rem', color: '#fafafa', marginBottom: '1rem', borderBottom: '1px solid #27272a', paddingBottom: '0.75rem' }}>
          ⌨️ Action Logs
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {log.map((item, i) => (
            <div key={i} style={{
              fontSize: '0.85rem',
              color: i === 0 ? '#38bdf8' : '#71717a',
              background: i === 0 ? 'rgba(56, 189, 248, 0.05)' : 'transparent',
              padding: '0.5rem 0.75rem',
              borderRadius: '0.4rem',
              borderLeft: i === 0 ? '3px solid #38bdf8' : '3px solid transparent',
              transition: 'all 0.3s'
            }}>
              {`> ${item}`}
            </div>
          ))}
          {log.length === 0 && (
            <div style={{color: '#3f3f46', fontSize: '0.85rem', textAlign: 'center', marginTop: '2rem'}}>
              No actions triggered yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
