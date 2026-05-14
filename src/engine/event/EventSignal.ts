import type {EventSignal, SubscribeEventOptions} from '../../types';
import {EventPhase} from '../../types';

/**
 * EventSignal Implementation
 * Manages subscribers across different event phases.
 */
export class EventSignalImpl<TEvent = any> implements EventSignal<TEvent> {
  public readonly name: string;
  private _phaseHandlers: Map<EventPhase, Set<(event: TEvent) => void>> = new Map();

  // Stack structure: supports nested emitLifecycle, each layer has independent prevented state
  private _preventedStack: boolean[] = [];

  // Created once, all emitLifecycle calls reuse the same function reference — zero allocation
  private _preventFn = () => {
    if (this._preventedStack.length > 0) {
      this._preventedStack[this._preventedStack.length - 1] = true;
    }
  };

  constructor(name: string) {
    this.name = name;
    for (const phase of Object.values(EventPhase)) {
      this._phaseHandlers.set(phase, new Set());
    }
  }

  /**
   * Subscribe to this event signal.
   * @param callback - Function called when the event is emitted
   * @param options - Optional subscription configuration
   * @returns Unsubscribe function or the original callback
   */
  public subscribe(
    callback: (event: TEvent) => void,
    options?: SubscribeEventOptions
  ): (() => void) {
    const targetPhase = options?.targetPhase ?? EventPhase.Finished;
    const returnOrigin = options?.returnOriginCallback ?? false;

    const phaseSet = this._phaseHandlers.get(targetPhase);
    if (!phaseSet) {
      throw new Error(`[EventSignal] Invalid phase: ${targetPhase}`);
    }

    phaseSet.add(callback);

    const unsubscribe = () => {
      phaseSet.delete(callback);
    };

    return returnOrigin ? (callback as unknown as () => void) : unsubscribe;
  }

  /**
   * Emit an event to subscribers of the specified phase.
   * Internal method used by the event system.
   * @param payload - Event payload
   * @param phase - Target phase
   */
  public emit(payload: TEvent, phase: EventPhase = EventPhase.Finished): void {
    const handlers = this._phaseHandlers.get(phase);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`[EventSignal] Error in handler for "${this.name}" (phase: ${phase}):`, error);
        }
      });
    }
  }

  /**
   * Emit an event through the full lifecycle:
   * WillCommit (payload injected with `prevent()` and `timestamp`) -> (if not prevented) -> Finished
   * WillCommit -> (if prevented) -> Aborted
   * Any phase -> Error on exception
   *
   * WillCommit subscribers receive `{...payload, prevent: () => void, timestamp: number}`.
   * Call `prevent()` to abort the commit and trigger the Aborted phase.
   *
   * @param payload - Event payload
   * @param onCommit - Optional async function to run when the event commiting logic.
   */
  public async emitLifecycle(
    payload: TEvent,
    onCommit?: () => Promise<void> | void
  ): Promise<void> {
    this._preventedStack.push(false);

    const willPayload = {
      ...payload,
      timestamp: Date.now(),
      prevent: this._preventFn
    } as TEvent;

    try {
      // 1. WillCommit phase — subscribers can call prevent() to cancel
      this.emit(willPayload, EventPhase.WillCommit);

      const prevented = this._preventedStack[this._preventedStack.length - 1];
      if (prevented) {
        this._preventedStack.pop();
        this.emit({...payload, timestamp: Date.now()} as TEvent, EventPhase.Aborted);
        return;
      }

      this._preventedStack.pop();

      // 2. Execute the commit logic between phases
      if (onCommit) {
        await onCommit();
      }

      // 3. Finished phase
      this.emit({...payload, timestamp: Date.now()} as TEvent, EventPhase.Finished);
    } catch (error) {
      this._preventedStack.pop();
      // 4. Error phase
      this.emit({...payload, timestamp: Date.now(), error} as TEvent, EventPhase.Error);
    }
  }

  /**
   * Remove all subscribers for a specific phase or all phases.
   * @param phase - Optional phase to clear. If not provided, clears all phases.
   */
  public clear(phase?: EventPhase): void {
    if (phase) {
      const handlers = this._phaseHandlers.get(phase);
      if (handlers) {
        handlers.clear();
      }
    } else {
      for (const handlers of this._phaseHandlers.values()) {
        handlers.clear();
      }
    }
  }

  /**
   * Get the number of subscribers for a specific phase or total.
   * @param phase - Optional phase to count
   */
  public listenerCount(phase?: EventPhase): number {
    if (phase) {
      return this._phaseHandlers.get(phase)?.size ?? 0;
    }
    let count = 0;
    for (const handlers of this._phaseHandlers.values()) {
      count += handlers.size;
    }
    return count;
  }
}