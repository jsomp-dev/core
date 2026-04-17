import React, {useState, useEffect} from 'react';
import {jsompEnv, BasicRegistry} from "@jsomp/core";
import {JsompView} from "@jsomp/core/react";

export const WindowNodeTest: React.FC = () => {
  const [isReady, setIsReady] = useState(false);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 10));
  };

  const getContrastColor = (hexcolor: string) => {
    const hex = hexcolor.replace('#', '');
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#FFFFFF';
  };

  useEffect(() => {
    const init = async () => {
      const jsomp = jsompEnv.service;
      BasicRegistry.registerAll(jsomp.components);

      const defaultColor = '#09090b';
      const reg = jsomp.atoms;
      reg.set('winTitle', 'JSOMP Window Lab');
      reg.set('winFavicon', 'https://vitejs.dev/logo.svg');
      reg.set('winLang', 'zh-CN');
      reg.set('winGuard', false);
      reg.set('winBodyColor', defaultColor);
      reg.set('winContrastColor', getContrastColor(defaultColor));

      jsomp.actions.register('on_shortcut_save', {handler: () => addLog('Global Action: SAVE (Ctrl+S)')});
      jsomp.actions.register('on_shortcut_search', {handler: () => addLog('Global Action: SEARCH (Meta+K)')});
      jsomp.actions.register('on_window_focus', {handler: () => addLog('Window: FOCUSED')});
      jsomp.actions.register('on_window_blur', {handler: () => addLog('Window: BLURRED')});

      jsomp.actions.register('lab.toggleGuard', {
        require: {atoms: {guard: 'winGuard'}},
        handler: ({atoms}) => {
          atoms.guard = !atoms.guard;
        }
      });

      jsomp.actions.register('random_color', {
        require: {atoms: {color: 'winBodyColor', text: 'winContrastColor'}},
        handler: ({atoms}) => {
          const newColor = `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`;
          atoms.color = newColor;
          atoms.text = getContrastColor(newColor);
          addLog(`Style: Body color updated to ${newColor}`);
        }
      });

      setIsReady(true);
    };
    init();
  }, []);

  const entities = [
    {
      id: 'win_controller',
      type: 'window',
      props: {
        title: '{{winTitle}}',
        favicon: '{{winFavicon}}',
        lang: '{{winLang}}',
        preventUnload: '{{winGuard}}',
        bodyStyle: {backgroundColor: '{{winBodyColor}}', transition: 'background 0.5s ease'}
      },
      actions: {
        'on_shortcut_save': ['key:ctrl+s'],
        'on_shortcut_search': ['key:meta+k', 'key:ctrl+k'],
        'on_window_focus': ['onFocus'],
        'on_window_blur': ['onBlur']
      }
    },
    {
      id: 'panel',
      type: 'Box',
      style_tw: ['p-10', 'bg-zinc-900/90', 'backdrop-blur-xl', 'border', 'border-zinc-800', 'rounded-3xl', 'shadow-2xl', 'max-w-xl', 'w-full', 'space-y-6'],
    },
    {
      id: 'test_title',
      type: 'Text',
      parent: 'panel',
      props: {children: 'Window Core Protocol', as: 'h1'},
      style_tw: ['text-4xl', 'font-black', 'text-white', 'tracking-tighter', 'mb-6']
    },
    {id: 'action_stack', type: 'Stack', parent: 'panel', props: {gap: '4'}},
    {
      id: 'btn_guard',
      type: 'Button',
      parent: 'action_stack',
      props: {
        children: {
          opType: 'if',
          target: '{{winGuard}}',
          then: 'Guard Status: ACTIVE',
          else: 'Guard Status: INACTIVE'
        }
      },
      style_tw: ['w-full', 'py-4', 'rounded-xl', 'font-bold', 'cursor-pointer', 'transition-all', 'duration-500', 'border', 'border-white/10'],
      style_css: {
        backgroundColor: {
          opType: 'if',
          target: '{{winGuard}}',
          then: '#10b981', // 开启时固定为翡翠绿
          else: '#292929ff' // 关闭时深灰色
        },
        color: '#FFFFFF',
        boxShadow: {
          opType: 'if',
          target: '{{winGuard}}',
          then: '0 0 20px rgba(16,185,129,0.4)',
          else: 'none'
        }
      },
      actions: {'lab.toggleGuard': ['onClick']}
    },
    {
      id: 'btn_color',
      type: 'Button',
      parent: 'action_stack',
      props: {children: 'Randomize Body Color'},
      style_tw: ['w-full', 'py-4', 'rounded-xl', 'font-bold', 'cursor-pointer', 'active:scale-95', 'transition-all', 'duration-500', 'border', 'border-white/10'],
      style_css: {
        backgroundColor: '{{winBodyColor}}',
        color: '{{winContrastColor}}'
      },
      actions: {'random_color': ['onClick']}
    },
    {id: 'input_stack', type: 'Stack', parent: 'panel', props: {gap: '4'}},
    {id: 'g1', type: 'Stack', parent: 'input_stack', props: {gap: '1'}},
    {id: 'lbl_1', type: 'Text', parent: 'g1', props: {children: 'Sync Document Title'}, style_tw: ['text-[10px]', 'text-zinc-500', 'font-bold', 'uppercase']},
    {id: 'in_t', type: 'Input', parent: 'g1', props: {value: '{{winTitle}}'}, style_tw: ['bg-black', 'border-zinc-800', 'text-emerald-400', 'p-3', 'rounded-lg', 'text-xs', 'w-full']},
    {id: 'g2', type: 'Stack', parent: 'input_stack', props: {gap: '1'}},
    {id: 'lbl_2', type: 'Text', parent: 'g2', props: {children: 'Sync Favicon URL'}, style_tw: ['text-[10px]', 'text-zinc-500', 'font-bold', 'uppercase']},
    {id: 'in_f', type: 'Input', parent: 'g2', props: {value: '{{winFavicon}}'}, style_tw: ['bg-black', 'border-zinc-800', 'text-cyan-400', 'p-3', 'rounded-lg', 'text-xs', 'w-full']},

    {
      id: 'log_area',
      type: 'Box',
      parent: 'panel',
      style_tw: ['mt-4', 'p-5', 'bg-black/50', 'rounded-2xl', 'border', 'border-zinc-800', 'h-40', 'overflow-y-auto'],
    },
    {
      id: 'log_display',
      type: 'Text',
      parent: 'log_area',
      props: {children: log.length ? log.join('\n') : 'Ready for signals...'},
      style_tw: ['text-zinc-500', 'text-[10px]', 'font-mono', 'whitespace-pre-wrap']
    }
  ];

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      {isReady && <JsompView entities={entities} />}
    </div>
  );
};
