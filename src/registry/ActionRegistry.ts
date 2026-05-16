import {jsompEnv} from '../JsompEnv';
import {IActionDef, IActionRegistry, IAtomRegistry, ISignalMappingDef, ITriggerSource, NamespaceEmitFunction} from '../types';
import {createActionAtomsProxy, createMergedAtomsProxy} from '../utils/proxy';

interface SubscribeSignalNamesapceOptions {
  namespace: string;
  eventName: string;
  subscribe: (emit: (payload: any) => void) => (() => void);
  unsubs: Array<() => void>;
}

interface SubscribeNamespaceOptions {
  namespace: string;
  subscribe: (emit: NamespaceEmitFunction) => (() => void);
  unsubs: Array<() => void>;
}

export class ActionRegistry implements IActionRegistry {
  private _actions = new Map<string, IActionDef>();
  private _triggerSources = new Map<string, ITriggerSource>();
  private _signalMappings = new Map<string, ISignalMappingDef>();
  private _signalSubscriptions = new Map<string, Array<() => void>>();
  private _atomRegistry?: IAtomRegistry;

  public setAtomRegistry(registry: IAtomRegistry): void {
    this._atomRegistry = registry;
  }

  public register<TAtoms extends Record<string, any> = any>(
    name: string,
    def: IActionDef<TAtoms> | IActionDef<TAtoms>['handler']
  ): void {
    if (typeof def === 'function') {
      this._actions.set(name, {
        handler: def as any
      });
    } else {
      this._actions.set(name, def);
    }
  }

  public async execute(tagName: string, env: any, trigger?: string): Promise<void> {
    const def = this._actions.get(tagName);
    if (!def) return;

    const fullTrigger = trigger || tagName;
    const [ns, eName] = fullTrigger.includes(':')
      ? fullTrigger.split(':')
      : ['dom', fullTrigger];

    // Build atoms: base from require mapping + incremental overrides from env.atoms
    let atomsEnv = env.atoms;
    if (def.require?.atoms && this._atomRegistry) {
      const baseAtoms = createActionAtomsProxy(this._atomRegistry, def.require.atoms);
      if (atomsEnv && typeof atomsEnv === 'object' && Object.keys(atomsEnv).length > 0) {
        atomsEnv = createMergedAtomsProxy(baseAtoms, atomsEnv);
      } else {
        atomsEnv = baseAtoms;
      }
    }

    // Build props: base from require keys + incremental overrides from env.props
    let propsEnv = env.props;
    if (def.require?.props) {
      const baseProps: Record<string, any> = {};
      for (const key of Object.keys(def.require.props)) {
        baseProps[key] = undefined;
      }
      if (propsEnv && typeof propsEnv === 'object') {
        propsEnv = {...baseProps, ...propsEnv};
      } else {
        propsEnv = baseProps;
      }
    } else if (!propsEnv || typeof propsEnv !== 'object') {
      propsEnv = {};
    }

    await def.handler({
      atoms: atomsEnv,
      props: propsEnv,
      event: env.event,
      originEvent: env.event,
      trigger: fullTrigger,
      namespace: ns,
      eventName: eName,
      contextPath: env.contextPath || tagName
    });
  }

  public getNames(): string[] {
    return Array.from(this._actions.keys());
  }

  /**
   * Register a trigger source for a specific trigger namespace.
   * @deprecated Use EventBus instead. EventBus provides unified event routing
   *             with registerChannel/subscribe/emit/bindSignal APIs.
   *             This method is kept for backward compatibility and will be removed in a future version.
   */
  public registerTriggerSource(namespace: string, source: ITriggerSource): void {
    this._triggerSources.set(namespace, source);
  }

  /**
   * Get the trigger source for a specific trigger namespace.
   * @deprecated Use EventBus instead. EventBus provides unified event routing
   *             with registerChannel/subscribe/emit/bindSignal APIs.
   *             This method is kept for backward compatibility and will be removed in a future version.
   */
  public getTriggerSource(namespace: string): ITriggerSource | undefined {
    return this._triggerSources.get(namespace);
  }

  private _subscribeSignalNamespace(options: SubscribeSignalNamesapceOptions) {
    const service = jsompEnv.service;
    if (!service) return;
    const {eventSignals, eventBus} = service;

    const {namespace, eventName, subscribe, unsubs} = options;
    const channel = `${namespace}:${eventName}`;
    eventSignals.register(channel);

    const signal = eventSignals.getSignal(channel);
    if (signal) {
      eventBus.bindSignal(channel, signal);
    }

    const unsub = subscribe((payload: any) => {
      eventBus.emit(channel, payload);
    });
    unsubs.push(unsub);
  }

  private _subscribeNamespace(options: SubscribeNamespaceOptions) {
    const service = jsompEnv.service;
    if (!service) return;
    const {eventSignals, eventBus} = service;

    const {namespace, subscribe, unsubs} = options;

    const unsub = subscribe((eventName: string, payload: any) => {
      const channel = `${namespace}:${eventName}`;
      if (!eventSignals.getSignal(channel)) {
        eventSignals.register(channel);
        const signal = eventSignals.getSignal(channel);
        if (signal) {
          eventBus.bindSignal(channel, signal);
        }
      }
      eventBus.emit(channel, payload);
    });
    unsubs.push(unsub);
  }

  /**
   * Register a signal mapping for a custom namespace.
   * Two patterns:
   * - `mapping`: Per-event subscriptions — each event name gets its own channel and subscribe function.
   * - `subscribe`: Namespace-level subscription — a single function bridges a third-party event system
   *   (e.g., Electron IPC, WebSocket) to the entire namespace. The emit function takes (eventName, payload)
   *   and lazily creates channels under 'namespace:eventName'.
   */
  public registerSignalMapping(namespace: string, mappingDef: ISignalMappingDef): void {
    this._signalMappings.set(namespace, mappingDef);

    const unsubs: Array<() => void> = [];
    const {mapping, subscribe} = mappingDef || {};

    if (!mapping && !subscribe) {
      return;
    }
    if (mapping) {
      for (const [eventName, subscribe] of Object.entries(mapping!)) {
        this._subscribeSignalNamespace({namespace, eventName, subscribe, unsubs});
      }
    }
    if (subscribe) {
      this._subscribeNamespace({namespace, subscribe, unsubs});
    }

    this._signalSubscriptions.set(namespace, unsubs);
  }

  /**
   * Get the signal mapping definition for a specific namespace.
   */
  public getSignalMapping(namespace: string): ISignalMappingDef | undefined {
    return this._signalMappings.get(namespace);
  }

  public getDefinition(name: string): IActionDef<any> | undefined {
    return this._actions.get(name);
  }

  public clear(): void {
    this._actions.clear();
    this._triggerSources.clear();
    // Clean up signal subscriptions
    for (const [, unsubs] of this._signalSubscriptions) {
      unsubs.forEach(unsub => unsub());
    }
    this._signalSubscriptions.clear();
    this._signalMappings.clear();
  }
}
