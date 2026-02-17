import {IJsompRenderContext, IStateTrait, IVisualTrait} from "../../../types";
import {useMemo} from "react";
import {StyleResolver} from "../StyleResolver";

/**
 * useStyleTrait: Converts JSOMP style descriptors into React-compatible className and style objects.
 */
export const useStyleTrait = (state: IStateTrait, context: IJsompRenderContext): IVisualTrait => {
  const {resolvedNode} = state;
  return useMemo(() => {
    const {className, style} = StyleResolver.resolve(resolvedNode, context);
    return {className, style};
  }, [resolvedNode, context.stylePresets]);
};
