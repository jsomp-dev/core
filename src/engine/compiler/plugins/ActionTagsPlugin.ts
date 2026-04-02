import {IActionRegistry, IJsompPluginDef, PipelineStage} from '../../../types';
import {createActionAtomsProxy} from '../../../utils/proxy';

/**
 * ActionTagsPlugin
 * Responsibility: Resolve semantic action tags and bind them to runtime event handlers.
 * Stage: Hydrate (Runs after paths and state are ready)
 * 
 * Update V1.2: Added support for Proxy-based "Atoms Mutation" within handlers.
 */
export const actionTagsPlugin: IJsompPluginDef = {
  id: 'standard-actions',
  stage: PipelineStage.Hydrate,
  onNode: (id, entity, ctx) => {
    // 1. Get resolved node from context. 
    // Must work on logic nodes to avoid mutating shared entity map and ensure persistence.
    const node = ctx.nodes.get(id);
    if (!node || !node.actions) return;

    const actionRegistry = ctx.actionRegistry as IActionRegistry;
    if (!actionRegistry) {
      ctx.logger.warn(`[ActionTags] ActionRegistry not found in compiler context. Skipping tag resolution for node "${id}".`);
      return;
    }

    // 2. Create a local buffer for THIS pass on THIS node
    // This allows composing multiple actions in one run while preventing pass-to-pass accumulation.
    const localHandlers: Record<string, Function> = {};

    // 3. Iterate through action tags
    Object.entries(node.actions as Record<string, string[]>).forEach(([tagName, eventNames]) => {
      const def = actionRegistry.getDefinition(tagName);
      if (!def) {
        ctx.logger.warn(`[ActionTags] Action definition for tag "${tagName}" not found. skipping.`);
        return;
      }

      // 4. Contract Audit (Optional but recommended)
      if (def.require) {
        // Atoms check
        if (def.require.atoms && ctx.atomRegistry) {
          const missingKeyPaths = Object.entries(def.require.atoms)
            .filter(([_, entry]) => {
              const realPath = typeof entry === 'string' ? entry : (entry as any).path;
              return ctx.atomRegistry!.get(realPath) === undefined;
            })
            .map(([_, entry]) => typeof entry === 'string' ? entry : (entry as any).path);

          if (missingKeyPaths.length > 0) {
            // Only warn if the registry is actually ready/connected
            if (ctx.atomRegistry?.getSnapshot?.()) {
              ctx.logger.warn(`[ActionTags] Node "${id}" (tag: ${tagName}) missing required atoms: ${missingKeyPaths.join(', ')}`);
            }
          }
        }

        // Props check
        if (def.require.props) {
          const missingProps = Object.keys(def.require.props)
            .filter(p => !node.props || !(p in node.props));
          if (missingProps.length > 0) {
            ctx.logger.warn(`[ActionTags] Node "${id}" (tag: ${tagName}) missing required props: ${missingProps.join(', ')}`);
          }
        }
      }

      // 5. Create Runtime Handler (Environment Injection)
      const actionHandler = async (eventPayload: any) => {
        const env = {
          // A. Aliased Atoms (V1.2: Proxy Support)
          atoms: (def.require?.atoms && ctx.atomRegistry) ?
            createActionAtomsProxy(ctx.atomRegistry, def.require.atoms) :
            {} as Record<string, any>,
          // B. Props Snapshot
          props: node.props || {},
          // C. Event Payload
          event: eventPayload
        };

        await def.handler(env);
      };

      // 6. Populate Local Buffer (Composition within pass)
      eventNames.forEach(evtName => {
        const existing = localHandlers[evtName];
        if (existing) {
          // If we have multiple tags for the same event in the SAME PASS, compose them
          localHandlers[evtName] = async (payload: any) => {
            await existing(payload);
            await actionHandler(payload);
          };
        } else {
          localHandlers[evtName] = actionHandler;
        }
      });
    });

    // 7. Atomic Overwrite back to node.onEvent
    // This wipes previous action-tag-bound handlers across passes while keeping other event types.
    if (Object.keys(localHandlers).length > 0) {
      node.onEvent = {
        ...node.onEvent,
        ...localHandlers
      };
    }
  }
};
