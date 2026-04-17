import {IJsompNode, PipelineContext, TraitProcessor, VisualDescriptor} from "../../../types";
import {jsompEnv} from "../../../JsompEnv";

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

  // Pass generated event handlers to the renderer
  if (node.onEvent) {
    const mappedEvents: Record<string, Function> = {};

    Object.entries(node.onEvent).forEach(([trigger, handler]) => {
      let propName = trigger;

      const [ns, name] = trigger.includes(':') ? trigger.split(':') : ['dom', trigger];

      // For known namespaces (dom, key), we need the active framework to map them
      // For custom namespaces (backend:, custom:), we use the default rule regardless
      const knownNamespaces = jsompEnv.frameworkLoader?.capabilityNamespaces || [];
      let isOwner = false;

      if (knownNamespaces.includes(ns)) {
        // Check if the framework supports the namespace
        const framework = jsompEnv.service.frameworks.getActive();
        isOwner = framework.isOwner(ns);
        if (isOwner) {
          propName = framework.mapPropName(ns, name);
        }
      }

      if (!isOwner) {
        // Default Rule for Custom Namespaces: on + Namespace + EventName (PascalCase)
        const pascalNS = ns.charAt(0).toUpperCase() + ns.slice(1);
        const pascalEvent = name.split('_').map(p => p.charAt(0).toUpperCase() + p.slice(1)).join('');
        propName = `on${pascalNS}${pascalEvent}`;

        // Store pre-processed trigger metadata for framework renderer to wire up lifecycle
        if (!descriptor.triggers) descriptor.triggers = [];
        descriptor.triggers.push({namespace: ns, event: name, prop: propName});
      }

      // Merge handlers if multiple neutral triggers map to the same framework prop (e.g., key:* -> onKeyDown)
      const existing = mappedEvents[propName];
      if (existing) {
        mappedEvents[propName] = async (payload: any) => {
          await (existing as any)(payload);
          await (handler as any)(payload);
        };
      } else {
        mappedEvents[propName] = handler;
      }
    });

    descriptor.props = {
      ...descriptor.props,
      ...mappedEvents
    };
  }
};
