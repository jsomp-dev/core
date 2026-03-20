import {IComponentRegistry} from '../../types';
import {Box, Text, Button, Input, Stack, Image} from './components';

/**
 * Basic Component Preset Registry (BasicRegistry)
 * A standard high-level component registry that maps semantic UI terms to Shadcn-style React components with consistent styling and interactive behaviors.
 * 
 * @status Stable
 * @scope Public
 * @tags Preset, UI-Components, Shadcn
 */
export class BasicRegistry {
  /**
   * Register high-level components to the component registry.
   */
  public static registerAll(registry: IComponentRegistry): void {
    registry.register('Box', Box, {
      desc: 'Generic container wrapper'
    });

    registry.register('Text', Text, {
      desc: 'Textual content with support for semantic tags',
      props: [
        {name: 'as', type: 'string', desc: 'HTML tag to use', def: 'span'}
      ]
    });

    registry.register('Button', Button, {
      desc: 'Semantic button with shadcn style',
      props: [
        {name: 'variant', type: 'string', desc: 'Visual style', def: 'default'},
        {name: 'size', type: 'string', desc: 'Box size', def: 'default'}
      ]
    });

    registry.register('Input', Input, {
      desc: 'Text input with shadcn style',
      props: [
        {name: 'type', type: 'string', desc: 'Input type', def: 'text'}
      ],
      sync: [
        {prop: 'value', event: 'onChange', extract: 'target.value', required: true}
      ]
    });

    registry.register('Stack', Stack, {
      desc: 'Flexbox based layout container',
      props: [
        {name: 'direction', type: 'string', desc: 'Direction (row/col)', def: 'col'},
        {name: 'gap', type: 'string', desc: 'Tailwind gap size', def: '2'},
        {name: 'align', type: 'string', desc: 'Align items'},
        {name: 'justify', type: 'string', desc: 'Justify content'}
      ]
    });

    registry.register('Image', Image, {
      desc: 'Image wrapper'
    });
  }
}
