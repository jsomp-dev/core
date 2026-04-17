import {IActionRegistry, IJsompPluginDef, PipelineStage} from '../../../types';
import {createActionAtomsProxy} from '../../../utils/proxy';
import {jsompEnv} from '../../../JsompEnv';

/**
 * ActionTagsPlugin
 * Responsibility: Resolve semantic action tags and bind them to runtime event handlers.
 * Stage: Hydrate (Runs after paths and state are ready)
 * 
 * Update V1.2: Added support for Proxy-based "Atoms Mutation" within handlers.
 * Update V1.2: Added native keyboard trigger support (key: prefix).
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

    // 2. Create local buffers
    const localHandlers: Record<string, Function> = {};

    // 3. Iterate through action tags
    Object.entries(node.actions as Record<string, string[]>).forEach(([tagName, triggers]) => {

      let actionHandler: Function;

      // A. Handle System Tags
      if (tagName === 'system:ignore') {
        actionHandler = async (e: any) => {
          // If it's a DOM event, prevent default
          if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
            e.stopPropagation();
          }
        };
      } else {
        // B. Handle Standard Tags
        const def = actionRegistry.getDefinition(tagName);
        if (!def) {
          ctx.logger.warn(`[ActionTags] Action definition for tag "${tagName}" not found. skipping.`);
          return;
        }

        // 4. Contract Audit (Atoms & Props check)
        if (def.require) {
          // Atoms check
          if (def.require.atoms && ctx.atomRegistry) {
            const missingKeyPaths = Object.entries(def.require.atoms)
              .filter(([_, entry]) => {
                const realPath = typeof entry === 'string' ? entry : (entry as any).path;
                return ctx.atomRegistry!.get(realPath) === undefined;
              })
              .map(([_, entry]) => typeof entry === 'string' ? entry : (entry as any).path);

            if (missingKeyPaths.length > 0 && ctx.atomRegistry?.getSnapshot?.()) {
              ctx.logger.warn(`[ActionTags] Node "${id}" (tag: ${tagName}) missing required atoms: ${missingKeyPaths.join(', ')}`);
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
        actionHandler = async (eventPayload: any, triggerOverride?: string) => {
          const fullTrigger = triggerOverride || tagName;
          const [ns, eName] = fullTrigger.includes(':') 
            ? fullTrigger.split(':') 
            : ['dom', fullTrigger];

          const env = {
            // A. Aliased Atoms (V1.2: Proxy Support)
            atoms: (def.require?.atoms && ctx.atomRegistry) ?
              createActionAtomsProxy(ctx.atomRegistry, def.require.atoms) :
              {} as Record<string, any>,
            // B. Props Snapshot
            props: node.props || {},
            // C. Event Data
            event: eventPayload,
            originEvent: eventPayload,
            // D. Trigger Identifier & Details
            trigger: fullTrigger,
            namespace: ns,
            eventName: eName
          };

          await def.handler(env);
        };
      }

      // 6. Populate Local Event Handlers (Using Neutral Trigger Keys)
      const triggerList = Array.isArray(triggers) ? triggers : [triggers];
      triggerList.forEach(trigger => {
        if (typeof trigger !== 'string') return;

        let finalHandler = (e: any) => actionHandler(e, trigger);
        const [ns, eventName] = trigger.includes(':') ? trigger.split(':') : ['dom', trigger];

        // Only need active framework for known namespaces that may need wrapping
        const knownNamespaces = jsompEnv.frameworkLoader?.capabilityNamespaces || [];
        if (knownNamespaces.includes(ns)) {
          const framework = jsompEnv.service.frameworks.getActive();
          if (framework.isOwner(ns) && framework.wrapHandler) {
            finalHandler = framework.wrapHandler(ns, eventName, finalHandler) as any;
          }
        }

        // Store using original trigger as key (Neutral)
        const existing = localHandlers[trigger];
        
        if (existing) {
          localHandlers[trigger] = async (payload: any) => {
            await existing(payload);
            await finalHandler(payload);
          };
        } else {
          localHandlers[trigger] = finalHandler;
        }
      });
    });

    // 7. Overwrite back to node.onEvent
    if (Object.keys(localHandlers).length > 0) {
      node.onEvent = {...node.onEvent, ...localHandlers};
    }
  }
};
