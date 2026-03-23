import {JsompAtom} from '../../../state';
import {SchemaRegistry} from '../../../registry';
import {ICompilerContext, IJsompPluginDef, PipelineStage} from "../../../types";

/**
 * Handles 'State' type entities and initializes them in the AtomRegistry.
 * Also supports implicit typed atoms based on SchemaRegistry matching.
 */
export const stateHydrationPlugin: IJsompPluginDef = {
  id: 'standard-state',
  stage: PipelineStage.Hydrate, // Moved to Hydrate to have computed paths (_fullPath)
  onNode: (id: string, entity: any, ctx: ICompilerContext) => {
    if (!ctx.atomRegistry) return;

    // 1. Explicit State type OR 2. Implicit matching via SchemaRegistry (ID or Type)
    const isExplicitState = entity.type === 'State';
    const schema = SchemaRegistry.global.get(id) || SchemaRegistry.global.get(entity.type);

    if (isExplicitState || schema) {
      if (!ctx.atomRegistry.get(id)) {
        const initialValue = entity.props?.value ?? entity.props?.initial;
        ctx.atomRegistry.set(id, new JsompAtom(initialValue, schema));
      }
    }

    // 3. V2: Local Node States (states property)
    // Automatically map node-local 'states' to the path registry: <nodePath>.states
    const node = ctx.nodes.get(id);
    if (node && node._fullPath && (entity.states || (entity.props && entity.props.states))) {
      const states = entity.states || entity.props.states;
      if (typeof states === 'object' && states !== null) {
        ctx.atomRegistry.patch(`${node._fullPath}.states`, states);
      }
    }
  }
};
