import {BindTagConfig} from "../../../types";

export const jsompEventTags: BindTagConfig[] = [
  {
    name: 'jsomp:mount',
    eventName: 'component_mount',
    description: 'Triggered when a jsomp component is mounted (initial render or mounted transitions from false to true).',
    category: 'built-in'
  },
  {
    name: 'jsomp:instance_ready',
    eventName: 'instance_ready',
    description: 'Triggered when a jsomp component is mounted and instance is ready for use.',
    category: 'built-in'
  },
];