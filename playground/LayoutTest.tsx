import React, {useMemo} from 'react';
import {createLayoutManager, } from '../src';
import {JsompView} from "../src/renderer/react";

/**
 * Static layout definition with 'as const' for type safety
 */
const TEST_LAYOUT = [
  {
    id: 'app_root',
    type: 'div',
    style_tw: ['p-8', 'bg-zinc-950', 'min-h-[200px]', 'rounded-lg', 'border', 'border-zinc-800'],
  },
  {
    id: 'isolated_root',
    type: 'div',
    style_tw: ['p-8', 'bg-zinc-950', 'min-h-[400px]', 'rounded-lg', 'border', 'border-zinc-800'],
  },
  {
    id: 'header',
    type: 'div',
    parent: 'app_root',
    style_tw: ['mb-6', 'pb-4', 'border-b', 'border-zinc-800'],
  },
  {
    id: 'title',
    type: 'h2',
    parent: 'header',
    props: {children: 'Layout Path Management Test'},
    style_tw: ['text-xl', 'font-semibold', 'text-zinc-50', 'tracking-tight'],
  },
  {
    id: 'content',
    type: 'div',
    parent: 'app_root',
    style_tw: ['space-y-4'],
  },
  {
    id: 'form',
    type: 'div',
    parent: 'content',
    style_tw: ['p-4', 'bg-zinc-900', 'rounded-lg', 'border', 'border-zinc-800/50'],
  },
  {
    id: 'submit_btn',
    type: 'button',
    parent: 'form',
    props: {children: 'Submit'},
    style_tw: ['px-4', 'py-1.5', 'bg-zinc-50', 'hover:bg-zinc-200', 'text-zinc-950', 'rounded', 'text-sm', 'font-medium', 'transition-colors'],
  },
  {
    id: 'footer',
    type: 'div',
    parent: 'app_root',
    style_tw: ['mt-8', 'text-zinc-500', 'text-xs'],
    props: {children: 'Paths are automatically calculated below'}
  }
] as const;

export const LayoutTest: React.FC = () => {
  // 1. Create a layout manager (Static usage example)
  const manager = useMemo(() => createLayoutManager(TEST_LAYOUT), []);

  // 2. Demonstration of Type-Safe path proxy
  const titlePath = manager.path.app_root.header.title.$; // root.header.title
  const subBtnPath = manager.path.app_root.content.form.submit_btn.$; // root.content.form.submit_btn

  // 3. Hierarchy snapshot for AI context simulation
  const hierarchySnapshot = JSON.stringify(manager.getHierarchy(), null, 2);

  console.log(manager.path.app_root.content.form.submit_btn.$);

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl">
      <section>
        <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-3">Live JSOMP Render</h3>
        <JsompView entities={TEST_LAYOUT as any} rootId="app_root" />
      </section>

      {/* B. Path Resolution Verification */}
      <section className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
          <h4 className="text-zinc-50 font-semibold text-sm mb-3">Type-Safe Paths Proxy</h4>
          <div className="space-y-2 font-mono text-xs">
            <div className="text-zinc-300">
              <span className="text-zinc-600">Title:</span> {titlePath}
            </div>
            <div className="text-zinc-300">
              <span className="text-zinc-600">Submit:</span> {subBtnPath}
            </div>
          </div>
        </div>

        <div className="p-4 bg-zinc-950 rounded-lg border border-zinc-800">
          <h4 className="text-zinc-50 font-semibold text-sm mb-3">Internal Index (getNodes)</h4>
          <div className="text-zinc-300 font-mono text-xs">
            {manager.getNodes('submit_btn').map(node => (
              <div key={node._fullPath}>
                Resolved: <span className="text-emerald-400 font-medium">{node._fullPath}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section>
        <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider mb-3">Topological Hierarchy</h3>
        <pre className="p-4 bg-zinc-950 text-zinc-400 rounded-lg border border-zinc-800 text-[11px] leading-relaxed overflow-auto max-h-[600px]">
          {hierarchySnapshot}
        </pre>
      </section>
    </div>
  );
};
