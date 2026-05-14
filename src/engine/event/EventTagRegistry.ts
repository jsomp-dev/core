import {
  BindTagOptions,
  EVENT_NAME_REGEX,
  EventPhase,
  EventTagMeta,
  IJsompEventTagRegistry,
  NAMESPACE_REGEX,
  RESERVED_NAMESPACES
} from '../../types';
import type {EventSignal, IActionRegistry} from '../../types';
import {EventSignalRegistry} from './EventSignalRegistry';
import {EventTriggerSource} from './EventTriggerSource';
import type {EventSignalImpl} from './EventSignal';

/**
 * EventTagRegistry Implementation
 * Binds pre-registered EventSignals to the action tags system via TriggerSource.
 * Signals must be registered via `service.eventSignals.register()` first,
 * then bound as tags here for action-tag integration and metadata management.
 */
export class EventTagRegistry implements IJsompEventTagRegistry {
  private _tags = new Map<string, EventTagMeta>();
  private _triggerSources = new Map<string, EventTriggerSource>();
  private _eventSignals: EventSignalRegistry;
  private _actionRegistry: IActionRegistry;

  constructor(eventSignals: EventSignalRegistry, actionRegistry: IActionRegistry) {
    this._eventSignals = eventSignals;
    this._actionRegistry = actionRegistry;
  }

  /**
   * Bind a pre-registered event signal as a tag, linking it to the action system.
   * The signal must already exist in EventSignalRegistry.
   * @param tagName - Tag identifier (e.g., 'myapp:user_login')
   * @param options - Required metadata, eventName locates the pre-registered signal
   */
  public bindTag(tagName: string, options: BindTagOptions): void {
    const validation = this.validate(tagName);
    if (!validation.valid) {
      throw new Error(`[EventTagRegistry] Invalid tag name "${tagName}": ${validation.error}`);
    }

    const [namespace] = this._parseName(tagName);
    const {eventName} = options;

    if (!eventName || !EVENT_NAME_REGEX.test(eventName)) {
      throw new Error(
        `[EventTagRegistry] Invalid eventName "${eventName}" in meta. Must be snake_case (e.g., "user_login").`
      );
    }

    const signalName = `${namespace}:${eventName}`;

    const signal = this._eventSignals.getSignal(signalName) as EventSignalImpl | undefined;
    if (!signal) {
      throw new Error(
        `[EventTagRegistry] Signal "${signalName}" not found. Register it first via service.eventSignals.register().`
      );
    }

    const targetPhase = options.targetPhase ?? EventPhase.Finished;

    const existingTag = this._tags.get(tagName);
    if (existingTag) {
      const existingSignalName = `${existingTag.namespace}:${existingTag.eventName}`;
      const existingSignal = this._eventSignals.getSignal(existingSignalName) as EventSignalImpl | undefined;
      if (existingSignal === signal && existingTag.targetPhase === targetPhase) {
        throw new Error(
          `[EventTagRegistry] Tag "${tagName}" is already bound with the same signal and phase (${targetPhase}).`
        );
      }
    }

    let triggerSource = this._triggerSources.get(namespace);
    if (!triggerSource) {
      triggerSource = new EventTriggerSource();
      this._triggerSources.set(namespace, triggerSource);
      this._actionRegistry.registerTriggerSource(namespace, triggerSource);
    }

    triggerSource.addSignal(eventName, signal, targetPhase);

    const tagMeta: EventTagMeta = {
      name: tagName,
      namespace,
      eventName,
      targetPhase,
      description: options.description,
      payloadType: options.payloadType,
      example: options.example,
      category: options.category ?? 'custom',
    };

    this._tags.set(tagName, tagMeta);
  }

  /**
   * Get the underlying EventSignal for a tag, useful for manual emit.
   * @param tagName - Tag name to look up
   */
  public getSignal<TEvent = any>(tagName: string): EventSignal<TEvent> | undefined {
    const tag = this._tags.get(tagName);
    if (!tag) {
      return undefined;
    }
    const signalName = `${tag.namespace}:${tag.eventName}`;
    return this._eventSignals.getSignal<TEvent>(signalName);
  }

  /**
   * Get tag metadata by full name.
   * @param name - Full event tag name
   */
  public getTag(name: string): EventTagMeta | undefined {
    return this._tags.get(name);
  }

  /**
   * Get all tags under a specific namespace.
   * @param ns - Namespace to query
   */
  public getTagsByNamespace(ns: string): EventTagMeta[] {
    const result: EventTagMeta[] = [];
    for (const tag of this._tags.values()) {
      if (tag.namespace === ns) {
        result.push(tag);
      }
    }
    return result;
  }

  /**
   * List all registered namespaces.
   */
  public getNamespaces(): string[] {
    const namespaces = new Set<string>();
    for (const tag of this._tags.values()) {
      namespaces.add(tag.namespace);
    }
    return Array.from(namespaces);
  }

  /**
   * Validate an event tag name against naming conventions.
   * Format: `namespace:event_name` where namespace is lowercase alphanumeric
   * and event_name is snake_case.
   * @param name - Full event tag name to validate
   */
  public validate(name: string): { valid: boolean; error?: string } {
    if (!name || typeof name !== 'string') {
      return {valid: false, error: 'Name must be a non-empty string'};
    }

    if (!name.includes(':')) {
      return {valid: false, error: 'Name must include a namespace separator ":" (e.g., "myapp:user_login")'};
    }

    const [namespace, eventName] = this._parseName(name);

    if (!namespace) {
      return {valid: false, error: 'Namespace cannot be empty'};
    }

    if (!eventName) {
      return {valid: false, error: 'Event name cannot be empty'};
    }

    if (!NAMESPACE_REGEX.test(namespace)) {
      return {valid: false, error: `Namespace "${namespace}" must be lowercase alphanumeric (e.g., "myapp")`};
    }

    if (this.isReserved(namespace)) {
      return {valid: false, error: `Namespace "${namespace}" is reserved and cannot be used for custom events`};
    }

    if (!EVENT_NAME_REGEX.test(eventName)) {
      return {valid: false, error: `Event name "${eventName}" must be snake_case (e.g., "user_login")`};
    }

    return {valid: true};
  }

  /**
   * Check if a namespace is reserved and cannot be used by custom events.
   * @param namespace - Namespace to check
   */
  public isReserved(namespace: string): boolean {
    return RESERVED_NAMESPACES.has(namespace);
  }

  /**
   * Parse a full tag name into namespace and event name.
   */
  private _parseName(name: string): [string, string] {
    const colonIndex = name.indexOf(':');
    if (colonIndex === -1) {
      return ['', name];
    }
    return [name.slice(0, colonIndex), name.slice(colonIndex + 1)];
  }
}