import {IJsompNode, PipelineContext, TraitProcessor, VisualDescriptor} from "../../../types";
import {BindingResolver} from "../../../state";

/**
 * Mustache Trait
 * 1. Resolves all {{mustache}} bindings in props using the registry.
 * 2. Implements "Auto-Sync": Injects onChange for inputs with pure bindings.
 */
export const mustacheTrait: TraitProcessor = (
  node: IJsompNode,
  descriptor: VisualDescriptor,
  context: PipelineContext
) => {
  const {registry} = context;

  // 1. Recursive Resolution of all props
  // We resolve the descriptor.props which already contains base props from PropsTrait
  const resolvedProps = BindingResolver.resolve(descriptor.props, registry);
  descriptor.props = resolvedProps;

  // 2. Auto-Sync Logic (Specific for Form Controls)
  const type = (descriptor.componentType as string || '').toLowerCase();
  const isInput = ['input', 'select', 'textarea'].includes(type);

  if (isInput) {
    // Check for pure binding in value or checked
    const valueBinding = BindingResolver.getBindingKey(node.props?.value);
    const checkedBinding = BindingResolver.getBindingKey(node.props?.checked);
    const bindingKey = valueBinding || checkedBinding;

    if (bindingKey && !descriptor.props.onChange) {
      descriptor.props.onChange = (e: any) => {
        const val = type === 'input' && node.props?.type === 'checkbox'
          ? e.target.checked
          : e.target.value;

        // Update registry
        registry.set(bindingKey, val);
      };

      // Also add a 'readOnly' fake prop if we don't want the React warning 
      // but we ARE providing onChange now, so the warning should go away.
    }
  }
};
