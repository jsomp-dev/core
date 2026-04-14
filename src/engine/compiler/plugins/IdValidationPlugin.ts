import {IJsompPluginDef, PipelineStage} from "../../../types";

/**
 * ID Validation Plugin
 * 
 * Ensures that node IDs do not contain dots, which are reserved for path separators.
 * This is a security and integrity check for the JSOMP hierarchy model.
 */
export const idValidationPlugin: IJsompPluginDef = {
  id: 'standard-id-validation',
  stage: PipelineStage.PreProcess,
  name: 'IdValidation',

  onNode: (id, entity, ctx) => {
    // Only validate UI nodes. 
    // State atoms/values in the entities map usually don't have a 'type' property.
    if (!ctx.isUiNode(entity)) return null;

    // 1. If an ID contains a dot, it MUST be an ID that originates from the entity pool.
    // Local IDs provided in the compilation context directly are forbidden from having dots
    // because dots represent hierarchy paths in JSOMP.
    if (id.includes('.')) {
      // Check if this ID is actually registered in the pool.
      // If it's not in the pool but has a dot, it's a developer error in input entities.
      const isPooled = ctx.entityPool?.get(id);

      if (!isPooled) {
        ctx.logger.throw(
          'INVALID_ENTITY_ID',
          `[Compiler][IdValidation] Invalid ID "${id}": Local entity IDs cannot contain dots. Dots are reserved for path separators.`
        );
      }
    }

    return null;
  }
};
