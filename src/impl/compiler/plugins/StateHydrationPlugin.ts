import {JsompAtom} from '../../core/JsompAtom';
import {SchemaRegistry} from '../../core/SchemaRegistry';
import {ICompilerContext, IJsompPluginDef, PipelineStage} from "../../../types";

/**
 * Handles 'State' type entities and initializes them in the AtomRegistry.
 * Also supports implicit typed atoms based on SchemaRegistry matching.
 */
export const stateHydrationPlugin: IJsompPluginDef = {
  id: 'standard-state',
  stage: PipelineStage.PreProcess,
  onNode: (id: string, entity: any, ctx: ICompilerContext) => {
    if (!ctx.atomRegistry) return;

    // 1. Explicit State type OR 2. Implicit matching via SchemaRegistry (ID or Type)
    const isExplicitState = entity.type === 'State';
    const schema = SchemaRegistry.global.get(id) || SchemaRegistry.global.get(entity.type);

    if (!isExplicitState && !schema) return;

    if (!ctx.atomRegistry.get(id)) {
      const initialValue = entity.props?.value ?? entity.props?.initial;

      // Create atom with schema (if any)
      ctx.atomRegistry.set(id, new JsompAtom(initialValue, schema));
    }
  }
};
