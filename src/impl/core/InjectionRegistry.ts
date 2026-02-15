import {IAtomValue, IJsompNode} from '../../types';

/**
 * Injection Registry
 * Core Responsibility: Calculate and merge static properties with runtime injections before rendering.
 */
export class InjectionRegistry {
  /**
   * Deeply merge static node data with dynamic injection table
   * @param node original node
   * @param fullPath pre-calculated full path
   * @param injection runtime injected node data (Atomic)
   */
  public static resolve(
    node: IJsompNode,
    fullPath: string,
    injection?: IAtomValue // Use any or IAtomValue, any is used here for compatibility
  ): {mergedNode: IJsompNode; injection: any} {
    const inj = injection || {};

    // Explicit assertion to resolve Lint errors on union type property access
    const injProps = (inj as any).props || {};
    const injPresets = (inj as any).style_presets || [];
    const injTw = (inj as any).style_tw || [];
    const injCss = (inj as any).style_css || {};

    const mergedNode: IJsompNode = {
      ...node,
      props: {...(node.props || {}), ...injProps},
      style_presets: [...(node.style_presets || []), ...injPresets],
      style_tw: [...(node.style_tw || []), ...injTw],
      style_css: {...(node.style_css || {}), ...injCss},
      _fullPath: fullPath
    };

    return {mergedNode, injection: inj};
  }
}
