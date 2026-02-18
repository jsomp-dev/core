import {IActionRegistry, IJsompPluginDef, PipelineStage} from '../../../types';

/**
 * ActionTagsPlugin
 * Responsibility: Resolve semantic action tags and bind them to runtime event handlers.
 * Stage: Hydrate (Runs after paths and state are ready)
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

    // 2. Iterate through action tags
    Object.entries(node.actions as Record<string, string[]>).forEach(([tagName, eventNames]) => {
      const def = actionRegistry.getDefinition(tagName);
      if (!def) {
        ctx.logger.warn(`[ActionTags] Action definition for tag "${tagName}" not found. skipping.`);
        return;
      }

      // 3. Contract Audit (Optional but recommended)
      if (def.require) {
        // Atoms check
        if (def.require.atoms && ctx.atomRegistry) {
          const missingAtoms = Object.entries(def.require.atoms)
            .filter(([_, realKey]) => !ctx.atomRegistry!.get(realKey));

          if (missingAtoms.length > 0) {
            ctx.logger.warn(`[ActionTags] Node "${id}" (tag: ${tagName}) missing required atoms: ${missingAtoms.map(a => a[1]).join(', ')}`);
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

      // 4. Create Runtime Handler (Environment Injection)
      const actionHandler = async (eventPayload: any) => {
        const env = {
          // A. Aliased Atoms
          atoms: {} as Record<string, any>,
          // B. Props Snapshot
          props: node.props || {},
          // C. Event Payload
          event: eventPayload
        };

        // Resolve atoms if required
        if (def.require?.atoms && ctx.atomRegistry) {
          Object.entries(def.require.atoms).forEach(([alias, realPath]) => {
            const atom = ctx.atomRegistry!.get(realPath);
            // Handle both IJsompAtom and IAtomValue
            env.atoms[alias] = (atom && 'value' in atom) ? atom.value : atom;
          });
        }

        await def.handler(env);
      };

      // 5. Bind to onEvent slots
      node.onEvent = node.onEvent || {};
      eventNames.forEach(evtName => {
        // If there's already a handler, we compose them (sequential execution)
        const existing = node.onEvent![evtName];
        if (existing) {
          const prevHandler = existing;
          node.onEvent![evtName] = async (payload: any) => {
            await prevHandler(payload);
            await actionHandler(payload);
          };
        } else {
          node.onEvent![evtName] = actionHandler;
        }
      });
    });
  }
};
