import {ICompilerContext} from '../types';
import {JsompAtom} from '../../core/JsompAtom';

/**
 * Handles 'State' type entities and initializes them in the AtomRegistry
 */
export const stateHydrationPlugin = (ctx: ICompilerContext) => {
  if (!ctx.atomRegistry) return;

  ctx.entities.forEach((entity, id) => {
    if (entity.type === 'State') {
      if (!ctx.atomRegistry!.get(id)) {
        const initialValue = entity.props?.value ?? entity.props?.initial;
        ctx.atomRegistry!.set(id, new JsompAtom(initialValue));
      }
    }
  });
};
