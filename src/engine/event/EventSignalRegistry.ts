import type {EventSignal, IJsompEventSignals} from "../../types";
import {RESERVED_NAMESPACES} from "../../types";
import {EventSignalImpl} from "./EventSignal";

/**
 * EventSignals Implementation
 * Low-level custom event signal registration, query, and management.
 * For action-tag-integrated event registration, use `service.eventTags.bindTag()` instead.
 * Accessible via `service.eventSignals`.
 */
export class EventSignalRegistry implements IJsompEventSignals {
  private _signals = new Map<string, EventSignalImpl>();

  /**
   * Register a custom event signal (low-level, no action bridging).
   * Validates namespace — rejects reserved namespaces (dom, key, system, jsomp).
   * For full action-tag integration, prefer `service.eventTags.bindTag()`.
   * @param name - Event name (e.g., 'myapp:userLogin')
   * @returns The EventSignal for the registered event
   */
  public register<TEvent = any>(name: string): EventSignal<TEvent> {
    this._validateNamespace(name);

    const existing = this._signals.get(name);
    if (existing) {
      return existing as EventSignal<TEvent>;
    }

    const signal = this._createSignal<TEvent>(name);
    return signal;
  }

  /**
   * Internal registration — skips namespace validation.
   * Used by JsompEvents to register built-in preset events under the jsomp namespace.
   */
  public _registerInternal<TEvent = any>(name: string): EventSignal<TEvent> {
    const existing = this._signals.get(name);
    if (existing) {
      return existing as EventSignal<TEvent>;
    }

    const signal = this._createSignal<TEvent>(name);
    return signal;
  }

  /**
   * Get a registered event signal by name.
   * @param name - Event name
   * @returns The EventSignal if found, undefined otherwise
   */
  public getSignal<TEvent = any>(name: string): EventSignal<TEvent> | undefined {
    return this._signals.get(name) as EventSignal<TEvent> | undefined;
  }

  /**
   * Get all registered signal names.
   */
  public getNames(): string[] {
    return Array.from(this._signals.keys());
  }

  /**
   * Create a new event signal and store it.
   */
  private _createSignal<TEvent>(name: string): EventSignalImpl<TEvent> {
    const signal = new EventSignalImpl<TEvent>(name);
    this._signals.set(name, signal);
    return signal;
  }

  /**
   * Validate that the event name's namespace is not reserved.
   */
  private _validateNamespace(name: string): void {
    if (!name || !name.includes(':')) {
      throw new Error(
        `[EventSignalRegistry] Invalid event name "${name}". Expected format: "namespace:event_name".`
      );
    }

    const namespace = name.split(':')[0];
    if (RESERVED_NAMESPACES.has(namespace)) {
      throw new Error(
        `[EventSignalRegistry] Namespace "${namespace}" is reserved and cannot be used for custom events.`
      );
    }
  }
}