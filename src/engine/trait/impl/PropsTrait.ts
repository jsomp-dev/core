import {IJsompNode, PipelineContext, TraitProcessor, VisualDescriptor, SubscriptionEntry} from "../../../types";
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
    descriptor.props = {
      ...descriptor.props,
      ...node.props
    };
  }

  // Pass generated event handlers to the renderer
  if (node.onEvent) {
    const mappedEvents: Record<string, Function> = {};
    const subscriptions: SubscriptionEntry[] = [];

    Object.entries(node.onEvent).forEach(([trigger, handler]) => {
      let propName = trigger;

      const [ns, name] = trigger.includes(':') ? trigger.split(':') : ['dom', trigger];

      // For known namespaces (dom, key), we need the active framework to map them
      // For custom namespaces (backend:, custom:), we use the default rule regardless
      const knownNamespaces = jsompEnv.frameworkLoader?.capabilityNamespaces || [];
      let isOwner = false;

      if (knownNamespaces.includes(ns)) {
        const framework = jsompEnv.service.frameworks.getActive();
        isOwner = framework.isOwner(ns);
        if (isOwner) {
          propName = framework.mapPropName(ns, name);
        }
      }

      if (!isOwner) {
        // Custom namespace: write to subscriptions for EventBus activation
        subscriptions.push({
          channel: trigger,
          handler: handler as (payload: any) => void,
        });
        return;
      }

      // Merge handlers if multiple neutral triggers map to the same framework prop
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

    if (subscriptions.length > 0) {
      descriptor.subscriptions = [
        ...(descriptor.subscriptions || []),
        ...subscriptions
      ];
    }
  }
};
