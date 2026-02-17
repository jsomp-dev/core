import {useMemo} from 'react';
import {
  IStateTrait,
  IVisualTrait,
  IInteractionTrait,
  IAssemblyTrait,
  IJsompRenderContext
} from '../../../types';
import {useExpressionTrait} from './useExpressionTrait';

/**
 * useAssemblyTrait: Standardizes the merger of disparate traits into a final props object.
 */
export const useAssemblyTrait = (
  state: IStateTrait,
  visual: IVisualTrait,
  interaction: IInteractionTrait,
  context: IJsompRenderContext,
  Renderer: React.ComponentType<any>
): IAssemblyTrait => {
  const {renderJsompInProps} = useExpressionTrait(context, state.path, Renderer);

  const {resolvedNode, path} = state;

  const props = useMemo(() => {
    const baseProps = resolvedNode.props || {};
    const synthProps = {
      id: resolvedNode.id,
      'data-jsomp-path': path,
      'data-jsomp-partial': (resolvedNode as any).__is_partial || undefined,
      className: visual.className,
      style: visual.style,
      ...interaction.events,
    };

    return renderJsompInProps({
      ...baseProps,
      ...synthProps,
    });
  }, [state, visual, interaction.events, context.atomRegistry, renderJsompInProps]);

  return {
    props
  };
};
