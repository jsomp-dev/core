/**
 * Event Phase Enum
 * Defines the lifecycle phases an event can go through.
 */
export enum EventPhase {
  WillCommit = 'WillCommit',
  Finished = 'Finished',
  Aborted = 'Aborted',
  Error = 'Error',
}

/**
 * Subscribe Event Options
 * Configures how a subscription behaves.
 */
export interface SubscribeEventOptions {
  /**
   * Target phase to subscribe to.
   * Defaults to Finished if not specified.
   */
  targetPhase?: EventPhase;

  /**
   * Whether to return the original callback function as the unsubscribe function.
   * If false, returns a no-arg unsubscribe function.
   * Defaults to false.
   */
  returnOriginCallback?: boolean;
}

/**
 * Readonly Event Signal Interface
 * Public-facing interface for preset events — only exposes subscribe, no emit.
 * Prevents external code from firing built-in lifecycle events.
 */
export interface ReadonlyEventSignal<TEvent = any> {
  readonly name: string;

  subscribe(
    callback: (event: TEvent) => void,
    options?: SubscribeEventOptions
  ): () => void;
}

/**
 * Event Signal Interface
 * Full signal with emit capability. Used for custom events registered via service.eventSignals.
 */
export interface EventSignal<TEvent = any> extends ReadonlyEventSignal<TEvent> {
  /**
   * Emit an event to subscribers of the specified phase.
   * @param payload - Event payload
   * @param phase - Target phase, defaults to Finished
   */
  emit(payload: TEvent, phase?: EventPhase): void;

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
  emitLifecycle(payload: TEvent, onCommit?: () => Promise<void> | void): Promise<void>;
}

/**
 * Setup Event Payload
 * Emitted when JSOMP initialization completes.
 * Custom events should be registered directly via service.eventSignals.
 */
export interface SetupEvent {}

/**
 * Instance Ready Event Payload
 * Emitted when a component instance becomes available.
 */
export interface InstanceReadyEvent {
  /** Node ID */
  id: string;
  /** Physical component instance */
  instance: any;
  /** Optional topology path */
  path?: string;
  /** Error if the instance registration failed */
  error?: Error;
}

/**
 * Component Mount Event Payload
 * Emitted when a jsomp component is mounted (initial render or when mounted transitions from false to true).
 */
export interface ComponentMountEvent {
  /** Node ID */
  id: string;
  /** Node entity data */
  entity: any;
  /** Timestamp of the event emission */
  timestamp: number;
}

/**
 * Event Tag Metadata
 * Describes a registered event tag with its namespace, validation, and documentation info.
 */
export interface EventTagMeta {
  /** Full event tag name, e.g. 'myapp:user_login' */
  name: string;
  /** Namespace */
  namespace: string;
  /** Event name (without namespace) */
  eventName: string;
  /** Which lifecycle phase the action system subscribes to (defaults to Finished) */
  targetPhase?: EventPhase;
  /** Human-readable description */
  description?: string;
  /** Payload type description */
  payloadType?: string;
  /** Usage example */
  example?: string;
  /** Tag category: built-in framework preset, custom user-defined, system internal */
  category?: 'built-in' | 'custom' | 'system';
}

export interface BindTagConfig extends Partial<EventTagMeta> {
  name: string;
  /**
   * Internal authentication key. When provided and matches jsompEnv.internalKey,
   * reserved namespace validation is skipped. Not for external use.
   * @internal
   */
  _internalKey?: string;
}

/**
 * Required metadata for binding a tag.
 * tagName and eventName are decoupled — tagName identifies the tag,
 * eventName identifies which pre-registered signal to bind to.
 */
export interface BindTagOptions extends Omit<BindTagConfig, 'name'> {
}

/**
 * Reserved namespaces that cannot be used by custom events.
 */
export const RESERVED_NAMESPACES = new Set(['dom', 'key', 'system', 'jsomp']);

/**
 * Regex for validating event names (snake_case).
 */
export const EVENT_NAME_REGEX = /^[a-z][a-z0-9_]*$/;

/**
 * Regex for validating namespace names (lowercase alphanumeric).
 */
export const NAMESPACE_REGEX = /^[a-z][a-z0-9]*$/;

/**
 * Jsomp Events Namespace Interface
 * Only exposes built-in preset event signals (readonly).
 * Use `eventSignals` on IJsompService for custom signal registration.
 */
export interface IJsompEvents {
  /**
   * Setup event - emitted when JSOMP is fully initialized.
   * Readonly — emit is restricted to JSOMP internals.
   */
  readonly setup: ReadonlyEventSignal<SetupEvent>;

  /**
   * Instance ready event - emitted when a component instance becomes available.
   * Readonly — emit is restricted to JSOMP internals.
   */
  readonly instanceReady: ReadonlyEventSignal<InstanceReadyEvent>;

  /**
   * Component mount event - emitted when a jsomp component is mounted (initial render or when mounted transitions from false to true).
   * Readonly — emit is restricted to JSOMP internals.
   */
  readonly componentMount: ReadonlyEventSignal<ComponentMountEvent>;
}

/**
 * Register Event Signal Options
 * Optional parameters for custom event signal registration.
 */
export interface RegisterEventSignalOptions {
  _internalKey?: string;
}


/**
 * Event Signals Management Interface
 * Custom event signal registration, query, and management.
 * Accessible via `service.eventSignals`.
 */
export interface IEventSignalRegistry {
  /**
   * Register a custom event signal.
   * @param name - Event name (e.g., 'myapp:userLogin')
   * @returns The EventSignal for the registered event
   */
  register<T = any>(name: string, options?: RegisterEventSignalOptions): EventSignal<T>;

  /**
   * Get a registered event signal by name.
   * @param name - Event name
   * @returns The EventSignal if found, undefined otherwise
   */
  getSignal<T = any>(name: string): EventSignal<T> | undefined;

  /**
   * Get all registered signal names.
   */
  getNames(): string[];
}

/**
 * Subscription Entry
 * Pre-compiled subscription info stored on VisualDescriptor during compilation.
 * Activated by the renderer when the component mounts.
 */
export interface SubscriptionEntry {
  /** Event channel name (e.g., 'jsomp:mount', 'backend:receive_msg') */
  channel: string;
  /** Handler function to invoke when the event fires */
  handler: (payload: any) => void;
}

/**
 * EventBus Interface
 * Central event routing layer that unifies EventSignal, TriggerSource,
 * and external event sources (Electron IPC, WebSocket, etc.) into a single path.
 */
export interface IEventBus {
  /**
   * Register an event channel.
   * Delegates to EventSignalRegistry internally.
   * @param channel - Channel name (e.g., 'jsomp:mount', 'backend:receive_msg')
   */
  registerChannel(channel: string): void;

  /**
   * Subscribe to an event channel.
   * @param channel - Channel name
   * @param handler - Handler function
   * @param options - Optional subscription options (targetPhase, etc.)
   * @returns Unsubscribe function
   */
  subscribe(channel: string, handler: (payload: any) => void, options?: SubscribeEventOptions): () => void;

  /**
   * Emit an event to a channel (simple emit, Finished phase).
   * @param channel - Channel name
   * @param payload - Event payload
   */
  emit(channel: string, payload: any): void;

  /**
   * Emit an event through the full lifecycle (WillCommit → Finished/Aborted/Error).
   * @param channel - Channel name
   * @param payload - Event payload
   * @param onCommit - Optional commit logic between WillCommit and Finished
   */
  emitLifecycle(channel: string, payload: any, onCommit?: () => Promise<void> | void): Promise<void>;

  /**
   * Bridge an EventSignal to an EventBus channel.
   * After binding, eventBus.emit(channel) delegates to signal.emit().
   * @param channel - Channel name
   * @param signal - The EventSignal instance
   */
  bindSignal(channel: string, signal: EventSignal): void;

  /**
   * Activate all subscriptions for a specific node.
   * Called by the renderer when the component mounts (in useLayoutEffect).
   * @param subscriptions - Array of SubscriptionEntry from VisualDescriptor
   * @returns Array of unsubscribe functions
   */
  activateSubscriptions(subscriptions: SubscriptionEntry[]): Array<() => void>;
}

/**
 * Event Tag Registry Interface
 * Normalized event tag registration with naming validation,
 * reserved namespace protection, and metadata management.
 * Accessible via `service.eventTags`.
 */
export interface IEventTagRegistry {
  /**
   * Bind a pre-registered event signal as a tag, linking it to the action system.
   * The signal must already be registered via `service.eventSignals.register()`.
   * @param name - Tag name (e.g., 'myapp:user_login'), identifies the tag in the action system
   * @param meta - Required metadata, must include eventName to locate the pre-registered signal
   */
  bindTag(name: string, meta: BindTagOptions): void;

  /**
   * Get the underlying EventSignal for a tag, useful for manual emit.
   * @param name - Full event tag name
   */
  getSignal<TEvent = any>(name: string): EventSignal<TEvent> | undefined;

  /**
   * Get tag metadata by full name.
   * @param name - Full event tag name
   */
  getTag(name: string): EventTagMeta | undefined;

  /**
   * Get all tags under a specific namespace.
   * @param ns - Namespace to query
   */
  getTagsByNamespace(ns: string): EventTagMeta[];

  /**
   * List all registered namespaces.
   */
  getNamespaces(): string[];

  /**
   * Validate an event tag name against naming conventions.
   * @param name - Full event tag name to validate
   */
  validate(name: string): {valid: boolean; error?: string};

  /**
   * Check if a namespace is reserved and cannot be used by custom events.
   * @param namespace - Namespace to check
   */
  isReserved(namespace: string): boolean;
}