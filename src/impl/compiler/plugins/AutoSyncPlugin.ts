import {IJsompPluginDef} from '../types';
import {BindingResolver} from '../../core/BindingResolver';
import {jsompEnv} from '../../../JsompEnv';
import {PipelineStage} from "../../../types";

/**
 * AutoSyncPlugin
 * Responsibility: Resolve Auto-Sync traits from component metadata and bind them to state atoms.
 * Stage: Hydrate (Runs when atoms and nodes are being finalized)
 */
export const autoSyncPlugin: IJsompPluginDef = {
  id: 'standard-auto-sync',
  stage: PipelineStage.Hydrate,
  onNode: (id, entity, ctx) => {
    // 1. Get current node from logic store
    const node = ctx.nodes.get(id);
    if (!node || !node.type) return;

    // 2. Lookup component metadata for sync traits
    const componentRegistry = jsompEnv.service?.componentRegistry;
    if (!componentRegistry) return;

    const meta = componentRegistry.getMeta(node.type);

    // 3. Handle Mandatory No-op Injection (to prevent crash)
    // Some controlled components will crash if 'value' is provided without 'onChange'.
    // Here we ensure a no-op handler exists for such cases.
    if (meta?.sync) {
      node.onEvent = node.onEvent || {};
      meta.sync.forEach(trait => {
        if (trait.required && !node.onEvent![trait.event]) {
          node.onEvent![trait.event] = () => { };
        }
      });
    }

    if (!meta?.sync || meta.sync.length === 0) return;

    const atomRegistry = ctx.atomRegistry;
    if (!atomRegistry) return;

    // Helper: Find property in raw entity hierarchy (ignoring resolved values in context)
    const getUnresolvedProp = (targetId: string, propName: string): any => {
      const e = ctx.entities.get(targetId);
      if (!e) return undefined;
      if (e.props && propName in e.props) return e.props[propName];
      if (e.inherit) return getUnresolvedProp(e.inherit, propName);
      return undefined;
    };

    // 4. Process each sync trait
    meta.sync.forEach(trait => {
      const {prop, event, extract, required} = trait;

      // A. Check if the prop is bound to a mustache key in the RAW entity hierarchy
      // We look up the raw hierarchy because node.props/entity.props might have been resolved by AttrCachePlugin.
      const bindingValue = getUnresolvedProp(id, prop);
      const atomKey = BindingResolver.getBindingKey(bindingValue);

      if (atomKey) {
        // Prepare extraction logic
        const extractor = typeof extract === 'function'
          ? extract
          : (args: any) => {
            if (extract === 'target.value') return args?.target?.value;
            if (extract === 'target.checked') return args?.target?.checked;
            if (extract === 'value') return args;
            return args;
          };

        // Create the sync handler
        const syncHandler = (eventArgs: any) => {
          const actualValue = extractor(eventArgs);
          const atom = atomRegistry.get(atomKey);

          if (atom && typeof (atom as any).set === 'function') {
            (atom as any).set(actualValue);
          } else {
            atomRegistry.set(atomKey, {value: actualValue});
          }
        };

        // B. Bind to onEvent with composition
        node.onEvent = node.onEvent || {};
        const existing = node.onEvent[event];

        if (existing) {
          const prev = existing;
          node.onEvent[event] = (...args: any[]) => {
            syncHandler(args[0]); // Run sync first
            return prev(...args);
          };
        } else {
          node.onEvent[event] = syncHandler;
        }
      } else if (required) {
        // C. If required but not bound to mustache, ensured a No-op (or keep existing)
        node.onEvent = node.onEvent || {};
        if (!node.onEvent[event]) {
          node.onEvent[event] = () => { };
        }
      }
    });
  }
};
