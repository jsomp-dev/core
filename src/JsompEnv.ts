import {JsompConfig, JsompLogger, JsompFlattener, JsompEventBus, IJsompEnv, IJsompService, IHostAdapter, IConfigRegistry} from './types';
import {ConfigRegistry} from './registry/ConfigRegistry';
import {JsompService} from './JsompService';

/**
 * JSOMP Environment Container (Global Registry)
 * A unified container for all tools and service instances.
 */
export class JsompEnv implements IJsompEnv {
  private _logger?: JsompLogger;
  private _flattener?: JsompFlattener;
  private _eventBus?: JsompEventBus;
  private _service?: IJsompService;
  private _config: IConfigRegistry = new ConfigRegistry();

  public isSetup = false;

  /**
   * Global registry instance
   */
  public static readonly instance = new JsompEnv();

  private constructor() { }

  // --- Getters with Guard ---

  public get logger(): JsompLogger {
    if (!this._logger) throw new Error('[JSOMP] Logger not initialized. Call setupJsomp() first.');
    return this._logger;
  }

  public get flattener(): JsompFlattener {
    if (!this._flattener) throw new Error('[JSOMP] Flattener not initialized. Call setupJsomp() first.');
    return this._flattener;
  }

  public get eventBus(): JsompEventBus | undefined {
    return this._eventBus || undefined;
  }

  public get service(): IJsompService {
    if (!this._service) throw new Error('[JSOMP] Service not initialized. Call setupJsomp() first.');
    return this._service;
  }

  public get config(): IConfigRegistry {
    return this._config;
  }

  /**
   * Initialize tools and variables in the container.
   * Supports dynamic injection and default fallbacks.
   */
  public async init(config: JsompConfig): Promise<void> {
    // 0. Merge user configuration into registry
    this._config.merge(config);

    // 1. Service Injection
    const injectedService = this._config.get('service');
    if (injectedService) {
      this._service = injectedService;
    } else {
      this._service = new JsompService();
    }

    // 2. Logger (Dynamic Load Default if missing)
    const logger = this._config.get('logger');
    if (logger) {
      this._logger = logger;
    } else if (!this._logger) {
      const {DefaultLogger} = await import('./uniform/DefaultLogger');
      this._logger = new DefaultLogger();
    }

    // 3. Flattener
    const flattener = this._config.get('flattener');
    if (flattener) {
      this._flattener = flattener;
    } else if (!this._flattener) {
      const {DefaultFlattener} = await import('./uniform/DefaultFlattener');
      this._flattener = new DefaultFlattener();
    }

    // 4. EventBus
    const eventBus = this._config.get('eventBus');
    if (eventBus) {
      this._eventBus = eventBus;
    } else if (!this._eventBus) {
      const {DefaultEventBus} = await import('./uniform/DefaultEventBus');
      this._eventBus = new DefaultEventBus();
    }

    // 5. Host Registry & Selection
    const hostId = this._config.get('host', 'react');

    if (hostId === 'react') {
      const {DefaultReactHost} = await import('./uniform/host/DefaultReactHost');
      this._service!.hosts.register('react', new DefaultReactHost());
    }

    // Set active host
    this._service!.hosts.setActive(hostId);
  }

  /**
   * Internal bridge to set service instance
   */
  public setService(service: IJsompService) {
    this._service = service;
  }
}

/**
 * Global singleton access to the container
 */
export const jsompEnv = JsompEnv.instance;


