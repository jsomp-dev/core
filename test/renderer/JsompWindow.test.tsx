import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {render, cleanup} from '@testing-library/react';
import {JsompWindow} from '../../src/renderer/react';

describe('JsompWindow Component', () => {


  beforeEach(() => {
    document.head.innerHTML = ''; // 先清空头部
    document.title = 'Original Title'; // 再设置初始标题
    document.body.className = '';
    document.body.style.cssText = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.removeAttribute('lang');
  });

  afterEach(() => {
    cleanup();
  });

  it('should render a simple div', () => {
    render(<div />);
  });

  it('should sync document title', () => {

    const {unmount} = render(<JsompWindow title="New Title" />);
    expect(document.title).toBe('New Title');
    unmount();
    expect(document.title).toBe('Original Title');
  });

  it('should sync favicon', () => {
    render(<JsompWindow favicon="https://example.com/favicon.ico" />);
    const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
    expect(link).toBeDefined();
    expect(link.href).toBe('https://example.com/favicon.ico');
  });

  it('should sync theme and lang on html element', () => {
    render(<JsompWindow theme="dark" lang="zh-CN" />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(document.documentElement.getAttribute('lang')).toBe('zh-CN');
  });

  it('should manage body classes', () => {
    const {unmount} = render(<JsompWindow bodyClass="bg-red-500 overflow-hidden" />);
    expect(document.body.classList.contains('bg-red-500')).toBe(true);
    expect(document.body.classList.contains('overflow-hidden')).toBe(true);
    unmount();
    expect(document.body.classList.contains('bg-red-500')).toBe(false);
  });

  it('should manage body styles', () => {
    const {unmount} = render(<JsompWindow bodyStyle={{ backgroundColor: 'blue' }} />);
    expect(document.body.style.backgroundColor).toBe('blue');
    unmount();
    expect(document.body.style.backgroundColor).toBe('');
  });

  it('should attach global event listeners', () => {
    const handler = vi.fn();
    render(<JsompWindow onKeyDown={handler} />);
    
    const event = new KeyboardEvent('keydown', { key: 'Enter' });
    window.dispatchEvent(event);
    
    expect(handler).toHaveBeenCalled();
  });

  it('should handle preventUnload', () => {
    const addListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeListenerSpy = vi.spyOn(window, 'removeEventListener');
    
    const {unmount} = render(<JsompWindow preventUnload={true} />);
    
    expect(addListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
    
    unmount();
    expect(removeListenerSpy).toHaveBeenCalledWith('beforeunload', expect.any(Function));
  });
});
