import {JsompConfig, JsompLogger, JsompFlattener, JsompEventBus, IJsompEnv, IJsompService} from './types';

/**
 * JSOMP Environment Container (Global Registry)
 * A unified container for all tools and service instances.
 */
export class JsompEnv implements IJsompEnv {
  private _logger?: JsompLogger;
  private _flattener?: JsompFlattener;
  private _eventBus?: JsompEventBus;
  private _service?: IJsompService;

  public isSetup = false;

  /**
   * Global registry instance
   */
  public static readonly instance = new JsompEnv();

  private constructor() { }

  // --- Getters with Guard ---

  public get logger(): JsompLogger {
    if (!this._logger) throw new Error('[JSOMP] Logger not initialized. Call setup() first.');
    return this._logger;
  }

  public get flattener(): JsompFlattener {
    if (!this._flattener) throw new Error('[JSOMP] Flattener not initialized. Call setup() first.');
    return this._flattener;
  }

  public get eventBus(): JsompEventBus | undefined {
    return this._eventBus || undefined;
  }

  public get service() {
    return this._service;
  }

  /**
   * Initialize tools and variables in the container.
   * Supports dynamic injection and default fallbacks.
   */
  public async init(config: JsompConfig): Promise<void> {
    // 1. Service Injection
    if (config.service) {
      this._service = config.service;
    }

    // 2. Logger (Dynamic Load Default if missing)
    if (config.logger) {
      this._logger = config.logger;
    } else if (!this._logger) {
      const {DefaultLogger} = await import('./uniform/DefaultLogger');
      this._logger = new DefaultLogger();
    }

    // 3. Flattener
    if (config.flattener) {
      this._flattener = config.flattener;
    } else if (!this._flattener) {
      const {DefaultFlattener} = await import('./uniform/DefaultFlattener');
      this._flattener = new DefaultFlattener();
    }

    // 4. EventBus
    if (config.eventBus) {
      this._eventBus = config.eventBus;
    } else if (!this._eventBus) {
      const {DefaultEventBus} = await import('./uniform/DefaultEventBus');
      this._eventBus = new DefaultEventBus();
    }

    this._logger!.info('JSOMP Environment Registry Bootstrapped.');
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


