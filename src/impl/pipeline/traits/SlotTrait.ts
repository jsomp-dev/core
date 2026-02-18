import {IJsompNode, PipelineContext, TraitProcessor, VisualDescriptor} from "@/types";

/**
 * Standard Slot Trait
 * Groups children into descriptor.slots.
 */
export const slotTrait: TraitProcessor = (
  node: IJsompNode,
  descriptor: VisualDescriptor,
  context: PipelineContext
) => {
  // Use 'any' cast to access children as they are not on IJsompNode interface
  const children = (node as any).children as IJsompNode[];

  if (children && Array.isArray(children)) {
    for (const child of children) {
      const slotName = child.slot || 'default';

      if (!descriptor.slots[slotName]) {
        descriptor.slots[slotName] = [];
      }

      descriptor.slots[slotName].push(child.id);
    }
  }
};