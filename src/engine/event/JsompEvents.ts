import type {EventSignal, IJsompEvents, InstanceReadyEvent, SetupEvent, } from '../../types';
import {EventSignalRegistry} from './EventSignalRegistry';

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

  constructor(eventSignals: EventSignalRegistry) {
    this.setup = eventSignals._registerInternal<SetupEvent>('jsomp:setup');
    this.instanceReady = eventSignals._registerInternal<InstanceReadyEvent>('jsomp:instanceReady');
  }
}

