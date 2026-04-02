import React, {useState, useEffect} from 'react';
import {jsompEnv, HtmlRegistry} from '../src';
import {JsompView, useAtom} from '../src/renderer/react';

/**
 * External Subscriber Component
 * Tests useAtom usage OUTSIDE JsompView
 */
const ExternalCounter: React.FC = () => {
  const [count, setCount] = useAtom('global_counter');

  return (
    <div style={{
      padding: '1.5rem',
      background: '#18181b',
      borderRadius: '0.75rem',
      border: '1px solid #27272a',
      marginBottom: '2rem',
      width: '100%',
      maxWidth: '500px'
    }}>
      <h3 style={{fontSize: '0.875rem', fontWeight: '600', color: '#a1a1aa', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>
        External React Subscriber (Outside JsompView)
      </h3>
      <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem'}}>
        <div style={{fontSize: '2.5rem', fontWeight: '700', color: '#fafafa', fontFamily: 'monospace'}}>
          {count ?? 0}
        </div>
        <div style={{display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
          <button
            onClick={() => setCount((prev: number) => (prev || 0) + 1)}
            style={{padding: '0.5rem 1rem', background: '#27272a', color: '#fafafa', border: '1px solid #3f3f46', borderRadius: '0.375rem', cursor: 'pointer'}}
          >
            Increment Global
          </button>
          <button
            onClick={() => setCount(0)}
            style={{padding: '0.25rem 0.5rem', background: 'transparent', color: '#71717a', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.75rem'}}
          >
            Reset
          </button>
        </div>
      </div>
      <p style={{marginTop: '1rem', fontSize: '0.75rem', color: '#52525b'}}>
        This component accesses <code>global_counter</code> via fallback to <code>jsompEnv.service.globalRegistry</code>.
      </p>
    </div>
  );
};

/**
 * Internal Custom Component
 * Registered to JSOMP to test useAtom usage INSIDE JsompView (with path resolution)
 */
const InternalPathWatcher: React.FC<{label: string}> = ({label}) => {
  // Accesses 'local_val' which should be resolved to the node's local states or scoped path
  const [val, setVal] = useAtom('local_val');

  return (
    <div style={{marginTop: '1rem', padding: '1rem', background: '#09090b', borderRadius: '0.5rem', border: '1px dashed #3f3f46'}}>
      <div style={{fontSize: '0.75rem', color: '#71717a', marginBottom: '0.5rem'}}>{label}</div>
      <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
        <input
          type="range"
          min="0"
          max="100"
          value={val || 0}
          onChange={(e) => setVal(parseInt(e.target.value))}
          style={{flex: 1}}
        />
        <span style={{fontFamily: 'monospace', color: '#38bdf8', fontWeight: 'bold'}}>{val || 0}</span>
      </div>
    </div>
  );
};

export const UseAtomTest: React.FC = () => {
  const [entities] = useState<any[]>([
    // 1. Templates (Base Styles) - Using inherit for reuse
    {
      id: 'tpl_card',
      type: 'div',
      style_tw: ['p-6', 'bg-zinc-900', 'rounded-xl', 'border', 'border-zinc-800', 'shadow-lg', 'flex', 'flex-col', 'gap-4']
    },
    {
      id: 'tpl_section_title',
      type: 'p',
      style_tw: ['text-sm', 'font-bold', 'text-zinc-500', 'uppercase', 'mb-2', 'tracking-widest']
    },

    // 2. Main Layout Container
    {
      id: 'root',
      type: 'div',
      style_tw: ['w-full', 'max-w-xl', 'flex', 'flex-col', 'gap-6']
    },

    // 3. Global Counter Display (Internal View)
    {
      id: 'global_section',
      inherit: 'tpl_card',
      parent: 'root'
    },
    {
      id: 'gs_title',
      inherit: 'tpl_section_title',
      parent: 'global_section',
      props: {children: 'Internal Jsomp Subscriber'}
    },
    {
      id: 'global_display',
      parent: 'global_section',
      type: 'p',
      props: {
        children: 'Value of {{global_counter}} observed inside JsompView.'
      },
      style_tw: ['text-zinc-200', 'text-lg']
    },

    // 4. Local State & Path Resolution Section
    {
      id: 'local_section',
      inherit: 'tpl_card',
      parent: 'root'
    },
    {
      id: 'ls_title',
      inherit: 'tpl_section_title',
      parent: 'local_section',
      props: {children: 'Local State & Path Resolution'}
    },
    
    // Explicit State Declaration (type: "state" is a logic-only node)
    // ID used as the path for useAtom
    {
      id: 'local_val',
      type: 'state',
      props: {initial: 66}
    },

    {
      id: 'timer_text',
      parent: 'local_section',
      type: 'p',
      props: {children: 'Atomic Value: {{local_val}}'},
      style_tw: ['text-zinc-400', 'font-mono']
    },
    {
      id: 'path_watcher_instance',
      parent: 'local_section',
      type: 'PathWatcher',
      props: {label: 'Interactive useAtom Hook (Local Subscriber)'}
    }
  ]);

  return (
    <div className="w-full flex flex-col items-center py-10 px-4 bg-[#09090b] min-h-screen">
      <h1 className="text-3xl font-bold text-white mb-8 tracking-tight">useAtom Reactive Test</h1>

      {/* 1. Test External Subscriber (Global Fallback) */}
      <ExternalCounter />

      {/* 2. Test Internal Subscriber (Context Based) */}
      <JsompView
        beforeMount={() => {
          const jsomp = jsompEnv.service!;
          // Note: Use HtmlRegistry instead of BasicRegistry to ensure basic tag support
          HtmlRegistry.registerAll(jsomp.componentRegistry);

          // Register custom component
          jsomp.componentRegistry.register('PathWatcher', InternalPathWatcher);

          // Bootstrap global counter if not exists
          if (jsomp.globalRegistry.get('global_counter') === undefined) {
            jsomp.globalRegistry.set('global_counter', 10);
          }
        }}
        entities={entities}
        rootId="root"
      />

      <div className="mt-12 p-6 bg-zinc-900/40 border border-zinc-800/60 rounded-xl text-xs text-zinc-500 max-w-xl leading-relaxed">
        <p className="font-semibold text-zinc-400 mb-2">Lab Test Cases:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>External Fallback</strong>: The top card is a standard React component accessing <code>global_counter</code> via <code>useAtom</code>. Since it's outside <code>JsompView</code>, the fallback mechanism to Global Registry is triggered.</li>
          <li><strong>Internal Mustache</strong>: The JSON view uses <code>{"{{global_counter}}"}</code> to reference the same variable, verifying full synchronization between the local and global registry systems.</li>
          <li><strong>Logic Nodes</strong>: An isolated <code>local_val</code> is defined via <code>type: "state"</code>. It is a headless node that exists only in the state registry and is not rendered as a DOM element.</li>
          <li><strong>Inherit Reuse</strong>: Both <code>global_section</code> and <code>local_section</code> inherit from <code>tpl_card</code>, verifying that style templates can be successfully reused across different nodes.</li>
        </ul>
      </div>
    </div>
  );
};
