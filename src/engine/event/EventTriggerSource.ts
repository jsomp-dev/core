import {EventPhase, IActionSourceMeta, ITriggerSource} from "../../types";
import {EventSignalImpl} from "./EventSignal";

interface SignalEntry {
  signal: EventSignalImpl;
  targetPhase: EventPhase;
}

/**
 * Event Trigger Source
 *
 * @deprecated Use EventBus instead. EventBus provides unified event routing
 *             with registerChannel/subscribe/emit/bindSignal APIs.
 *             This class is kept for backward compatibility and will be removed in a future version.
 *
 * Manages multiple EventSignals under a single namespace, bridging them to the action tags system.
 * One EventTriggerSource instance per namespace, routing by eventName internally.
 * Each signal can be bound to a specific EventPhase (defaults to Finished).
 */
export class EventTriggerSource implements ITriggerSource {
  private _signals = new Map<string, SignalEntry>();

  /**
   * Add an event signal to this namespace trigger source.
   * @param eventName - Event name (without namespace prefix)
   * @param signal - The EventSignal instance
   * @param targetPhase - Which lifecycle phase to subscribe to (defaults to Finished)
   */
  public addSignal(eventName: string, signal: EventSignalImpl, targetPhase: EventPhase = EventPhase.Finished): void {
    this._signals.set(eventName, { signal, targetPhase });
  }

  /**
   * Check if a signal is registered for the given event name.
   */
  public hasSignal(eventName: string): boolean {
    return this._signals.has(eventName);
  }

  /**
   * Subscribe to a specific event within this namespace.
   * Routes to the correct signal by eventName when the action system triggers,
   * using the targetPhase configured when the signal was added.
   * @param eventName - Event name (without namespace prefix)
   * @param emit - Callback invoked when the action fires
   * @returns Unsubscribe function
   */
  subscribe(eventName: string, emit: (payload: any) => void, sourceMeta: IActionSourceMeta): () => void {
    const tagName = `${sourceMeta.namespace}:${sourceMeta.name}`;
    const entry = this._signals.get(tagName);
    if (!entry) {
      console.warn(`[EventTriggerSource] No signal found for event "${eventName}" in this namespace`);
      return () => {};
    }
    return entry.signal.subscribe(emit, {
      targetPhase: entry.targetPhase,
    });
  }
}