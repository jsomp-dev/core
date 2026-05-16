import type {EventSignal, IEventBus, IEventSignalRegistry, SubscribeEventOptions, SubscriptionEntry} from '../../types';
import {EventSignalRegistry} from './EventSignalRegistry';

/**
 * EventBus Implementation
 * Central event routing layer that delegates to EventSignalRegistry for signal management.
 * Provides a unified API for channel registration, subscription, emission, and lifecycle control.
 *
 * Relationship with EventSignalRegistry:
 * - EventBus is the "control plane" — knows about channels, nodes, and compilation
 * - EventSignalRegistry is the "data plane" — manages raw signal instances
 * - EventBus delegates all signal operations to EventSignalRegistry
 */
export class EventBus implements IEventBus {
  private _signalRegistry: IEventSignalRegistry;
  private _signalMap = new Map<string, EventSignal>();

  constructor(signalRegistry: IEventSignalRegistry) {
    this._signalRegistry = signalRegistry;
  }

  public registerChannel(channel: string): void {
    const existing = this._signalRegistry.getSignal(channel);
    if (!existing) {
      this._signalRegistry.register(channel);
    }
  }

  public subscribe(
    channel: string,
    handler: (payload: any) => void,
    options?: SubscribeEventOptions
  ): () => void {
    const signal = this._resolveSignal(channel);
    if (!signal) {
      console.warn(`[EventBus] No signal found for channel "${channel}". Call registerChannel() or bindSignal() first.`);
      return () => {};
    }
    return signal.subscribe(handler, options);
  }

  public emit(channel: string, payload: any): void {
    const signal = this._resolveSignal(channel);
    if (signal) {
      signal.emit(payload);
    }
  }

  public async emitLifecycle(
    channel: string,
    payload: any,
    onCommit?: () => Promise<void> | void
  ): Promise<void> {
    const signal = this._resolveSignal(channel);
    if (signal) {
      await signal.emitLifecycle(payload, onCommit);
    }
  }

  public bindSignal(channel: string, signal: EventSignal): void {
    this._signalMap.set(channel, signal);
  }

  /**
   * Resolve a channel to its EventSignal.
   * Checks direct signal registry first, then falls back to the signal map.
   */
  private _resolveSignal(channel: string): EventSignal | undefined {
    return this._signalRegistry.getSignal(channel) ?? this._signalMap.get(channel);
  }

  public activateSubscriptions(subscriptions: SubscriptionEntry[]): Array<() => void> {
    const unsubs: Array<() => void> = [];
    for (const sub of subscriptions) {
      const unsub = this.subscribe(sub.channel, sub.handler);
      if (unsub) {
        unsubs.push(unsub);
      }
    }
    return unsubs;
  }
}