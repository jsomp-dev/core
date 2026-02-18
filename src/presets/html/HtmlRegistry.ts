import {IComponentRegistry} from '../../types';

/**
 * Standard HTML Element Registry for the "Open Core" free version.
 * Maps standard HTML tags to themselves for pass-through rendering.
 */
export class HtmlRegistry {
  /**
   * Register standard HTML elements to the component registry.
   * This allows JSOMP to render basic HTML without any UI library dependency.
   */
  public static registerAll(registry: IComponentRegistry): void {
    const tags = [
      'div', 'span', 'p', 'a', 'img', 'button', 'input', 'textarea',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'dl', 'dt', 'dd',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'form', 'label', 'select', 'option',
      'header', 'footer', 'main', 'nav', 'section', 'article', 'aside',
      'video', 'audio', 'iframe', 'canvas',
      'br', 'hr', 'strong', 'em', 'code', 'pre', 'blockquote'
    ];

    tags.forEach(tag => {
      const meta: any = {
        desc: `Native HTML <${tag}> element`
      };

      // Add synchronization traits for form elements
      if (tag === 'input' || tag === 'textarea' || tag === 'select') {
        meta.events = ['onChange', 'onInput', 'onFocus', 'onBlur', 'onKeyDown', 'onKeyUp'];
        meta.sync = [
          {prop: 'value', event: 'onChange', extract: 'target.value', required: true},
          {prop: 'checked', event: 'onChange', extract: 'target.checked'}
        ];
      }

      registry.register(tag, tag, meta);
    });
  }
}
