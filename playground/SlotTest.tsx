import React, {useState} from 'react';
import {JsompPage, jsomp} from '@jsomp/core';

// 1. Define a Mock Component that uses Slots
const CustomCard: React.FC<{
  title: string,
  header?: React.ReactNode,
  children?: React.ReactNode,
  footer?: React.ReactNode
}> = ({title, header, children, footer}) => {
  return (
    <div style={{
      background: '#1e293b',
      borderRadius: '1rem',
      overflow: 'hidden',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      width: '100%',
      maxWidth: '400px',
      margin: '1rem auto',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
    }}>
      {header && (
        <div style={{padding: '0.75rem 1rem', background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
          {header}
        </div>
      )}
      <div style={{padding: '1.5rem'}}>
        <h3 style={{margin: '0 0 1rem 0', color: '#3b82f6'}}>{title}</h3>
        {children}
      </div>
      {footer && (
        <div style={{padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.1)'}}>
          {footer}
        </div>
      )}
    </div>
  );
};

export const SlotTest: React.FC = () => {
  const [entities] = useState<any[]>([
    {
      id: 'app_root',
      type: 'div',
      style_css: {
        padding: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        alignItems: 'center'
      }
    },
    {
      id: 'title',
      type: 'h2',
      parent: 'app_root',
      props: {children: 'Slot Standardization Test'},
      style_tw: ['text-2xl', 'font-bold', 'text-white', 'mb-4']
    },
    // --- Card 1: Using NEW slot attribute ---
    {
      id: 'card_new',
      type: 'CustomCard',
      parent: 'app_root',
      props: {title: 'Modern Slot Property'}
    },
    {
      id: 'header_new',
      type: 'span',
      parent: 'card_new',
      slot: 'header',
      props: {children: '🔥 Header Slot (New)'},
      style_css: {color: '#fbbf24', fontWeight: 'bold'}
    },
    {
      id: 'content_new',
      type: 'p',
      parent: 'card_new',
      props: {children: 'This card uses the standard "slot" attribute.'},
      style_css: {color: '#94a3b8'}
    },
    {
      id: 'footer_new',
      type: 'button',
      parent: 'card_new',
      slot: 'footer',
      props: {children: 'New Action'},
      style_css: {
        background: '#3b82f6',
        border: 'none',
        color: 'white',
        padding: '0.4rem 0.8rem',
        borderRadius: '0.4rem'
      }
    },

    // --- Card 2: Using LEGACY [slot] notation ---
    {
      id: 'card_legacy',
      type: 'CustomCard',
      parent: 'app_root',
      props: {title: 'Legacy Slot Notation'},
      style_css: {marginTop: '2rem'}
    },
    {
      id: 'header_legacy',
      type: 'span',
      parent: '[slot]card_legacy.header',
      props: {children: '🕰️ Header Slot (Legacy)'},
      style_css: {color: '#60a5fa', fontWeight: 'bold'}
    },
    {
      id: 'content_legacy',
      type: 'p',
      parent: 'card_legacy',
      props: {children: 'This card uses the legacy "[slot]parent.id.slot" format to ensure backward compatibility.'},
      style_css: {color: '#94a3b8'}
    }
  ]);

  return (
    <div style={{width: '100%', maxWidth: '600px'}}>
      <JsompPage
        entities={entities}
        rootId='app_root'
        components={{
          CustomCard
        }}
      />

      <div style={{
        marginTop: '2rem',
        padding: '1rem',
        background: 'rgba(59, 130, 246, 0.1)',
        borderRadius: '0.5rem',
        border: '1px dashed #3b82f6',
        color: '#93c5fd',
        fontSize: '0.9rem'
      }}>
        <strong>Debug Info:</strong>
        <ul style={{margin: '0.5rem 0 0 1.5rem', padding: 0}}>
          <li>Slot 1: Explicit <code>slot: "header"</code> attribute.</li>
          <li>Slot 2: Legacy <code>parent: "[slot]card.header"</code> notation.</li>
          <li>Both are resolved to the same internal structure.</li>
        </ul>
      </div>
    </div>
  );
};
