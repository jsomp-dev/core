import {jsompEnv} from "../../../JsompEnv";
import {useMemo} from "react";
import {IInteractionTrait, IJsompRenderContext, IStateTrait} from "../../../types";

/**
 * useInteractionTrait: Manages interaction logic, including event handlers and component resolution.
 */
export const useInteractionTrait = (state: IStateTrait, context: IJsompRenderContext): IInteractionTrait & {Component: any} => {
  const {resolvedNode, injection} = state;
  const {components, componentRegistry} = context;

  // 1. Resolve event handlers
  const events = useMemo(() => {
    return {
      ...(resolvedNode.onEvent || {}),
      ...((injection as any).onEvent || {})
    };
  }, [resolvedNode.onEvent, injection]);

  // 2. Component lookup
  const Component = useMemo(() => {
    // Priority: Local component table -> Global component registry -> Fallback
    const contextComp = components?.[resolvedNode.type];
    if (contextComp) return contextComp;

    const regComp = componentRegistry?.get(resolvedNode.type);
    if (regComp) return regComp;

    const type = resolvedNode.type || 'div';
    if (resolvedNode.type) {
      jsompEnv.logger.warn(`Component type "${resolvedNode.type}" not found in registries. Falling back to native tag or div.`);
    }

    const isPascal = /^[A-Z]/.test(type);
    return isPascal ? 'div' : type;
  }, [resolvedNode.type, components, componentRegistry]);

  return {
    events,
    Component
  };
};
