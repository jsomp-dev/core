import {internalKey} from '../../misc';
import type {ComponentMountEvent, EventSignal, IEventSignalRegistry, IEventTagRegistry, IJsompEvents, InstanceReadyEvent, SetupEvent, } from '../../types';
import {jsompEventTags} from './config/JsompEventTags';

/**
 * JsompEvents Implementation
 * Only exposes built-in preset event signals (readonly).
 * Accessible via `service.events`.
 */
export class JsompEvents implements IJsompEvents {
  /**
   * Setup event - emitted when JSOMP is fully initialized.
   */
  public readonly setup: EventSignal<SetupEvent>;

  /**
   * Instance ready event - emitted when a component instance becomes available.
   */
  public readonly instanceReady: EventSignal<InstanceReadyEvent>;

  /**
   * Component mount event - emitted when a jsomp component is mounted (initial render or when mounted transitions from false to true).
   */
  public readonly componentMount: EventSignal<ComponentMountEvent>;

  constructor(eventSignals: IEventSignalRegistry, eventTags: IEventTagRegistry) {
    const options = {_internalKey: internalKey};
    this.setup = eventSignals.register<SetupEvent>('jsomp:setup', options);
    this.instanceReady = eventSignals.register<InstanceReadyEvent>('jsomp:instance_ready', options);
    this.componentMount = eventSignals.register<ComponentMountEvent>('jsomp:component_mount', options);

    jsompEventTags.forEach(tag => eventTags.bindTag(tag.name, {...tag, _internalKey: internalKey}));
  }
}

