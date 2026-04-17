import {IHostAdapter} from '../../types';
import {KeyboardUtils} from '../../utils/keyboard';

/**
 * Default React Host Adapter
 */
export class DefaultReactHost implements IHostAdapter {
  public readonly target = 'react';

  public isOwner(namespace: string): boolean {
    return namespace === 'dom' || namespace === 'key';
  }

  public mapPropName(namespace: string, eventName: string): string {
    if (namespace === 'key') {
      return 'onKeyDown';
    }

    // Normalized name (snake_case)
    let normalizedName = eventName.toLowerCase();

    // Remove 'on' prefix if present
    if (normalizedName.startsWith('on')) {
      normalizedName = normalizedName.substring(2);
    }

    // Support legacy/shorthand aliases
    if (normalizedName === 'doubleclick' || normalizedName === 'dblclick') normalizedName = 'double_click';

    // Convert snake_case to PascalCase (e.g., double_click -> DoubleClick)
    const pascalName = normalizedName
      .split('_')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

    return `on${pascalName}`;
  }

  public wrapHandler(namespace: string, eventName: string, original: Function): Function {
    if (namespace === 'key') {
      return async (e: KeyboardEvent) => {
        if (KeyboardUtils.isMatch(e, eventName)) {
          // Standard behavior for matched shortcut: consume event
          if (typeof e.preventDefault === 'function') {
            e.preventDefault();
            e.stopPropagation();
          }
          await original(e);
        }
      };
    }
    return original;
  }
}
