import {jsompEnv} from "../JsompEnv";

const BINDING_REGEX = /\{\{(.+?)\}\}/g;
const PURE_BINDING_REGEX = /^\{\{(.+?)\}\}$/;

import {IAtomRegistry, IJsompAtom} from '../types';

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
        // Special protection: do not recurse for React or complex objects
        if (val.$$typeof || val._isAMomentObject) return;

        // Safely traverse object properties, filtering out private or specific properties
        try {
          Object.values(val).forEach(scan);
        } catch (e) {
          jsompEnv.logger.warn('Failed to traverse object for binding keys:', e);
        }
      }
    };

    scan(value);
    return Array.from(keys);
  }


  /**
   * Resolve values (pure function)
   */
  static resolve(value: any, registry: IAtomRegistry, pathStack?: string[]): any {
    if (value === null || value === undefined) return value;

    // 0. Direct Atom object
    if (isAtom(value)) {
      return value.value;
    }

    // 1. Array
    if (Array.isArray(value)) {
      return value.map(item => this.resolve(item, registry, pathStack));
    }

    // 2. String
    if (typeof value === 'string') {
      // Pure match "{{key}}"
      const pureMatch = value.match(PURE_BINDING_REGEX);
      if (pureMatch) {
        const k = pureMatch[1].trim();
        const atom = this.resolvePath(registry, k, pathStack);
        if (isAtom(atom)) return atom.value;
        if (atom && typeof atom === 'object' && 'value' in atom) return atom.value;
        return atom ?? value;
      }

      // Interpolation "text-{{color}}"
      return value.replace(BINDING_REGEX, (_, k) => {
        const atom = this.resolvePath(registry, k.trim(), pathStack);
        if (isAtom(atom)) return atom.value;
        if (atom && typeof atom === 'object' && 'value' in atom) return atom.value;
        return atom ?? '';
      });
    }

    // 3. Recursive properties (only for plain objects)
    if (typeof value === 'object') {
      // Special protection: do not recurse for React or complex objects
      if (value.$$typeof || value._isAMomentObject) return value;

      const res: any = {};
      for (const k in value) {
        if (Object.prototype.hasOwnProperty.call(value, k)) {
          res[k] = this.resolve(value[k], registry, pathStack);
        }
      }
      return res;
    }

    return value;
  }

  /**
   * Resolve a key with pathStack backtracking (Scope-like behavior)
   */
  private static resolvePath(registry: IAtomRegistry, key: string, pathStack?: string[]): any {
    // 1. Try resolving against shrinking stack
    if (pathStack && pathStack.length > 0) {
      for (let i = pathStack.length; i >= 0; i--) {
        const currentPath = pathStack.slice(0, i).join('.');
        const fullPath = currentPath ? `${currentPath}.${key}` : key;
        const val = registry.get(fullPath);
        if (val !== undefined) return val;
      }
    }

    // 2. Resolve as global root path
    return registry.get(key);
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
