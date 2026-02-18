import {IJsompNode, PipelineContext, TraitProcessor, VisualDescriptor} from "../../../types";

/**
 * Standard Props Trait
 * Copies standard props from node to descriptor, serving as a base for other traits.
 */
export const propsTrait: TraitProcessor = (
  node: IJsompNode,
  descriptor: VisualDescriptor,
  context: PipelineContext
) => {
  if (node.props) {
    // Copy all props as base. 
    // Higher priority specific traits (like contentTrait) will override these if needed.
    descriptor.props = {
      ...descriptor.props,
      ...node.props
    };
  }
};
