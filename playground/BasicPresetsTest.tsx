import React, {useMemo, useState} from 'react';
import {jsompEnv, BasicRegistry} from '../src';
import {JsompView} from '../src/renderer/react';

export const BasicPresetsTest: React.FC = () => {
  const [entities] = useState<any[]>([
    {
      id: 'root',
      type: 'Stack',
      props: {
        gap: '6',
        direction: 'col',
        align: 'stretch'
      },
      style_tw: ['p-8', 'bg-zinc-950', 'min-h-[600px]', 'rounded-xl', 'border', 'border-zinc-800', 'w-full', 'max-w-xl', 'shadow-2xl']
    },
    {
      id: 'header',
      type: 'Stack',
      parent: 'root',
      props: {gap: '1', direction: 'col'},
      style_tw: ['border-b', 'border-zinc-800', 'pb-6']
    },
    {
      id: 'title',
      type: 'Text',
      parent: 'header',
      props: {
        as: 'h2',
        children: 'Basic Presets'
      },
      style_tw: ['text-2xl', 'font-semibold', 'tracking-tight', 'text-zinc-50']
    },
    {
      id: 'subtitle',
      type: 'Text',
      parent: 'header',
      props: {
        children: 'Testing high-level semantic components registered via BasicRegistry.'
      },
      style_tw: ['text-zinc-500', 'text-sm']
    },

    // --- Button Section ---
    {
      id: 'button-section',
      type: 'Stack',
      parent: 'root',
      props: {gap: '4', direction: 'col'}
    },
    {
      id: 'button-label',
      type: 'Text',
      parent: 'button-section',
      props: {children: 'Buttons'},
      style_tw: ['text-sm', 'font-medium', 'text-zinc-400']
    },
    {
      id: 'button-group',
      type: 'Stack',
      parent: 'button-section',
      props: {gap: '3', direction: 'row', align: 'center'},
      style_tw: ['flex-wrap']
    },
    {
      id: 'btn-default',
      type: 'Button',
      parent: 'button-group',
      props: {children: 'Default', variant: 'default'}
    },
    {
      id: 'btn-outline',
      type: 'Button',
      parent: 'button-group',
      props: {children: 'Outline', variant: 'outline'}
    },
    {
      id: 'btn-ghost',
      type: 'Button',
      parent: 'button-group',
      props: {children: 'Ghost', variant: 'ghost'}
    },

    // --- Input Section ---
    {
      id: 'input-section',
      type: 'Stack',
      parent: 'root',
      props: {gap: '3', direction: 'col'}
    },
    {
      id: 'input-label-group',
      type: 'Stack',
      parent: 'input-section',
      props: {gap: '1.5', direction: 'col'}
    },
    {
      id: 'input-label',
      type: 'Text',
      parent: 'input-label-group',
      props: {children: 'Input with Auto-Sync'},
      style_tw: ['text-sm', 'font-medium', 'text-zinc-400']
    },
    {
      id: 'input-desc',
      type: 'Text',
      parent: 'input-label-group',
      props: {children: 'The preview text below will update as you type.'},
      style_tw: ['text-[12px]', 'text-zinc-600']
    },
    {
      id: 'input-field',
      type: 'Input',
      parent: 'input-section',
      props: {
        placeholder: 'Enter text here...',
        value: '{{testInput}}'
      }
    },
    {
      id: 'input-echo',
      type: 'Text',
      parent: 'input-section',
      props: {
        children: 'Preview: {{testInput}}'
      },
      style_tw: ['text-xs', 'text-zinc-500', 'font-mono', 'bg-zinc-900/50', 'p-2', 'rounded', 'border', 'border-zinc-800/50']
    },

    // --- Image Section ---
    {
      id: 'image-section',
      type: 'Stack',
      parent: 'root',
      props: {gap: '3', direction: 'col'}
    },
    {
      id: 'image-label',
      type: 'Text',
      parent: 'image-section',
      props: {children: 'Media'},
      style_tw: ['text-sm', 'font-medium', 'text-zinc-400']
    },
    {
      id: 'image-display',
      type: 'Image',
      parent: 'image-section',
      props: {
        src: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=600&auto=format&fit=crop',
        alt: 'Abstract'
      },
      style_tw: ['w-full', 'h-40', 'object-cover', 'rounded-lg', 'border', 'border-zinc-800']
    }
  ]);

  return (
    <div className="w-full flex justify-center py-10">
      <JsompView
        entities={entities}
        rootId="root"
        beforeMount={() => {
          const jsomp = jsompEnv.service!;
          BasicRegistry.registerAll(jsomp.components);

          jsomp.atoms.set('testInput', {value: 'Hello JSOMP'});
        }}
      />
    </div>
  );
};
