const BINDING_REGEX = /\{\{(.+?)\}\}/g;
const PURE_BINDING_REGEX = /^\{\{(.+?)\}\}$/;

import {IAtomRegistry, IJsompAtom} from '../../types';
import {internalContext as context} from '../../context';

function isAtom(obj: any): obj is IJsompAtom {
  return obj && typeof obj.subscribe === 'function' && 'value' in obj;
}

export class BindingResolver {
  /**
   * Extract binding keys from various objects
   */
  static extractKeys(value: any): string[] {
    const keys = new Set<string>();

    const scan = (val: any) => {
      if (val === null || val === undefined) return;

      if (typeof val === 'string') {
        const matches = val.match(BINDING_REGEX);
        matches?.forEach(m => {
          keys.add(m.replace(/[\{\}]/g, '').trim());
        });
      } else if (Array.isArray(val)) {
        val.forEach(scan);
      } else if (typeof val === 'object' && !isAtom(val)) {
        // Safely traverse object properties, filtering out private or specific properties
        try {
          Object.values(val).forEach(scan);
        } catch (e) {
          context.logger.warn('Failed to traverse object for binding keys:', e);
        }
      }
    };

    scan(value);
    return Array.from(keys);
  }

  /**
   * Resolve values (pure function)
   */
  static resolve(value: any, registry: IAtomRegistry): any {
    if (value === null || value === undefined) return value;

    // 0. Direct Atom object
    if (isAtom(value)) {
      return value.value;
    }

    // 1. Array
    if (Array.isArray(value)) {
      return value.map(item => this.resolve(item, registry));
    }

    // 2. String
    if (typeof value === 'string') {
      // Pure match "{{key}}"
      const pureMatch = value.match(PURE_BINDING_REGEX);
      if (pureMatch) {
        const k = pureMatch[1].trim();
        const atom = registry.get(k);
        return isAtom(atom) ? atom.value : (atom?.value ?? atom ?? value);
      }

      // Interpolation "text-{{color}}"
      return value.replace(BINDING_REGEX, (_, k) => {
        const val = registry.get(k.trim());
        return isAtom(val) ? val.value : (val?.value ?? val ?? '');
      });
    }

    // 3. Recursive properties (only for plain objects)
    if (typeof value === 'object') {
      // Special protection: do not recurse for React or complex objects
      if (value.$$typeof || value._isAMomentObject) return value;

      const res: any = {};
      for (const k in value) {
        if (Object.prototype.hasOwnProperty.call(value, k)) {
          res[k] = this.resolve(value[k], registry);
        }
      }
      return res;
    }

    return value;
  }

  /**
   * Helper: Get pure binding key (for Auto-Sync detection)
   * If the value is a pure binding like "{{userName}}", returns "userName"
   */
  static getBindingKey(value: any): string | null {
    if (typeof value !== 'string') return null;
    const match = value.match(PURE_BINDING_REGEX);
    return match ? match[1].trim() : null;
  }
}
