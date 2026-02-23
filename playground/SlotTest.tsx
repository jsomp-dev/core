import React, {useMemo, useState} from 'react';
import {createLayoutManager} from "@jsomp/core";
import {JsompView} from "@jsomp/core/react";

// 1. Define a Mock Component that uses Slots
const CustomCard: React.FC<{
  title: string,
  header?: React.ReactNode,
  children?: React.ReactNode,
  footer?: React.ReactNode
}> = ({title, header, children, footer}) => {
  return (
    <div style={{
      background: '#18181b',
      borderRadius: '0.5rem',
      overflow: 'hidden',
      border: '1px solid #27272a',
      width: '100%',
      maxWidth: '400px',
      margin: '1rem auto'
    }}>
      {header && (
        <div style={{padding: '0.75rem 1rem', background: '#27272a33', borderBottom: '1px solid #27272a'}}>
          {header}
        </div>
      )}
      <div style={{padding: '1.5rem'}}>
        <h3 style={{margin: '0 0 1rem 0', color: '#fafafa', fontSize: '1rem', fontWeight: '600'}}>{title}</h3>
        {children}
      </div>
      {footer && (
        <div style={{padding: '0.75rem 1rem', background: '#00000022', borderTop: '1px solid #27272a'}}>
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
      style_tw: ['text-xl', 'font-semibold', 'text-zinc-50', 'mb-6', 'tracking-tight']
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
      props: {children: 'Header Slot (New)'},
      style_css: {color: '#fafafa', fontWeight: 'bold', fontSize: '0.875rem'}
    },
    {
      id: 'content_new',
      type: 'p',
      parent: 'card_new',
      props: {children: 'This card uses the standard "slot" attribute.'},
      style_css: {color: '#a1a1aa', fontSize: '0.875rem'}
    },
    {
      id: 'footer_new',
      type: 'button',
      parent: 'card_new',
      slot: 'footer',
      props: {children: 'New Action'},
      style_css: {
        background: '#fafafa',
        border: 'none',
        color: '#09090b',
        padding: '0.4rem 0.8rem',
        borderRadius: '0.25rem',
        fontSize: '0.75rem',
        fontWeight: '500'
      }
    }
  ]);
  const [includePath, setIncludePath] = useState(false);

  // 1. Create a layout manager to verify hierarchy
  const manager = useMemo(() => createLayoutManager(entities as any), [entities]);
  const hierarchySnapshot = JSON.stringify(manager.getHierarchy({includePath}), null, 2);

  return (
    <div style={{width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '2rem'}}>
      <section>
        <JsompView
          entities={entities}
          rootId='app_root'
          components={{
            CustomCard
          }}
        />
      </section>

      <section style={{
        padding: '1rem',
        background: '#18181b',
        borderRadius: '0.5rem',
        border: '1px solid #27272a',
        color: '#a1a1aa',
        fontSize: '0.8125rem',
        lineHeight: '1.5'
      }}>
        <strong style={{color: '#fafafa'}}>Debug Info:</strong>
        <p style={{marginTop: '0.5rem'}}>
          JSOMP uses the standard <code>slot</code> attribute for component distribution.
          Legacy path-based slot notation has been deprecated and removed.
        </p>
      </section>

      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Topological Hierarchy</h3>
          <label className="flex items-center gap-2 text-[10px] text-zinc-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includePath}
              onChange={e => setIncludePath(e.target.checked)}
            />
            Include Path Property
          </label>
        </div>
        <pre className="p-4 bg-zinc-950 text-zinc-400 rounded-lg border border-zinc-800 text-[11px] leading-relaxed overflow-auto max-h-[400px]">
          {hierarchySnapshot}
        </pre>
      </section>
    </div>
  );
};
