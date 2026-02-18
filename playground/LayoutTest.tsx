import React, {useMemo} from 'react';
import {createLayoutManager, JsompPage} from '../src';

/**
 * Static layout definition with 'as const' for type safety
 */
const TEST_LAYOUT = [
  {
    id: 'app_root',
    type: 'div',
    style_tw: ['p-8', 'bg-slate-900', 'min-h-[200px]', 'rounded-xl', 'border', 'border-slate-800'],
  },
  {
    id: 'isolated_root',
    type: 'div',
    style_tw: ['p-8', 'bg-slate-900', 'min-h-[400px]', 'rounded-xl', 'border', 'border-slate-800'],
  },
  {
    id: 'header',
    type: 'div',
    parent: 'app_root',
    style_tw: ['mb-6', 'pb-4', 'border-b', 'border-slate-800'],
  },
  {
    id: 'title',
    type: 'h2',
    parent: 'header',
    props: {children: 'Layout Path Management Test'},
    style_tw: ['text-2xl', 'font-bold', 'text-blue-400'],
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
    style_tw: ['p-4', 'bg-slate-800/50', 'rounded-lg'],
  },
  {
    id: 'submit_btn',
    type: 'button',
    parent: 'form',
    props: {children: 'Submit'},
    style_tw: ['px-4', 'py-2', 'bg-blue-600', 'hover:bg-blue-500', 'text-white', 'rounded'],
  },
  {
    id: 'footer',
    type: 'div',
    parent: 'app_root',
    style_tw: ['mt-8', 'text-slate-500', 'text-sm'],
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
      {/* A. Live Render */}
      <section>
        <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">Live JSOMP Render</h3>
        <JsompPage entities={TEST_LAYOUT as any} rootId="app_root" />
      </section>

      {/* B. Path Resolution Verification */}
      <section className="grid grid-cols-2 gap-4">
        <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
          <h4 className="text-blue-400 font-bold mb-2">Type-Safe Paths Proxy</h4>
          <div className="space-y-2 font-mono text-sm">
            <div className="text-slate-300">
              <span className="text-slate-500">Title:</span> {titlePath}
            </div>
            <div className="text-slate-300">
              <span className="text-slate-500">Submit:</span> {subBtnPath}
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-950 rounded-lg border border-slate-800">
          <h4 className="text-blue-400 font-bold mb-2">Internal Index (getNodes)</h4>
          <div className="text-slate-300 font-mono text-sm">
            {manager.getNodes('submit_btn').map(node => (
              <div key={node._fullPath}>
                Resolved: <span className="text-green-400">{node._fullPath}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* C. Hierarchy Viewer (AI View) */}
      <section>
        <h3 className="text-slate-400 text-xs font-bold uppercase mb-2">Topological Hierarchy (getHierarchy)</h3>
        <pre className="p-4 bg-slate-950 text-emerald-500 rounded-lg border border-slate-800 text-xs overflow-auto max-h-[600px]">
          {hierarchySnapshot}
        </pre>
      </section>
    </div>
  );
};
