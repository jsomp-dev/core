import React, {useEffect, useLayoutEffect} from 'react';

export interface JsompWindowProps {
  /** 
   * 页面标题 (document.title)
   */
  title?: string;

  /** 
   * 页面图标 URL (favicon)
   */
  favicon?: string;

  /** 
   * 主题标识符 (设置在 html 标签的 data-theme 属性上)
   */
  theme?: string;

  /** 
   * 语言标识符 (设置在 html 标签的 lang 属性上)
   */
  lang?: string;

  /** 
   * document.body 的类名
   */
  bodyClass?: string;

  /** 
   * document.body 的内联样式
   */
  bodyStyle?: React.CSSProperties;

  /** 
   * 是否拦截窗口关闭/刷新 (beforeunload)
   * 可以是布尔值或显示的提示文本（部分现代浏览器可能忽略自定义文本）
   */
  preventUnload?: boolean | string;

  /** 
   * 透传所有事件句柄 (Action Tags 生成的 onEvent 都会通过这里挂载到 window)
   */
  [key: string]: any;
}

/**
 * JsompWindow 组件
 * 
 * 这是一个“虚拟节点”组件，在 UI 上不产生任何渲染内容（返回 null），
 * 但负责将 JSOMP 节点的属性转化为全局窗口或文档的状态/事件监听。
 */
export const JsompWindow: React.FC<JsompWindowProps> = (props) => {
  const {
    title,
    favicon,
    theme,
    lang,
    bodyClass,
    bodyStyle,
    preventUnload,
    ...rest
  } = props;

  // 1. 同步页面标题
  useLayoutEffect(() => {
    if (title !== undefined) {
      const originalTitle = document.title;
      document.title = title;
      return () => {
        document.title = originalTitle;
      };
    }
  }, [title]);

  // 2. 同步 Favicon
  useLayoutEffect(() => {
    if (favicon) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      const originalHref = link?.href;
      
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      
      link.href = favicon;
      
      return () => {
        if (link && originalHref !== undefined) {
          link.href = originalHref;
        }
      };
    }
  }, [favicon]);

  // 3. 同步 HTML 根属性 (Theme & Lang)
  useLayoutEffect(() => {
    if (theme) {
      document.documentElement.setAttribute('data-theme', theme);
    }
    if (lang) {
      document.documentElement.setAttribute('lang', lang);
    }
  }, [theme, lang]);

  // 4. 管理 Body 类名
  useLayoutEffect(() => {
    if (bodyClass) {
      const classes = bodyClass.split(/\s+/).filter(Boolean);
      document.body.classList.add(...classes);
      return () => {
        document.body.classList.remove(...classes);
      };
    }
  }, [bodyClass]);

  // 5. 管理 Body 样式
  useLayoutEffect(() => {
    if (bodyStyle) {
      const originalStyle = document.body.style.cssText;
      Object.assign(document.body.style, bodyStyle);
      return () => {
        document.body.style.cssText = originalStyle;
      };
    }
  }, [bodyStyle]);

  // 6. 全局事件绑定 (实现全局 Action Tags)
  useEffect(() => {
    const activeListeners: Array<{type: string; handler: any}> = [];

    Object.entries(rest).forEach(([propName, handler]) => {
      // 识别以 on 开头且值为函数的属性（通常是 ActionTagsPlugin 生成的句柄）
      if (propName.startsWith('on') && typeof handler === 'function') {
        // 将 React 风格的事件名转换为原生小写事件名
        // 例如: onKeyDown -> keydown, onClick -> click, onResize -> resize
        const nativeType = propName.slice(2).toLowerCase();
        
        const wrappedHandler = (e: any) => {
          handler(e);
        };

        window.addEventListener(nativeType, wrappedHandler);
        activeListeners.push({type: nativeType, handler: wrappedHandler});
      }
    });

    return () => {
      activeListeners.forEach(({type, handler}) => {
        window.removeEventListener(type, handler);
      });
    };
  }, [rest]);

  // 7. 页面卸载拦截
  useEffect(() => {
    if (preventUnload) {
      const handleBeforeUnload = (e: BeforeUnloadEvent) => {
        e.preventDefault();
        e.returnValue = typeof preventUnload === 'string' ? preventUnload : '';
        return e.returnValue;
      };
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  }, [preventUnload]);

  // 不渲染任何视觉内容
  return null;
};
