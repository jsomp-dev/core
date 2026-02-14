import {JsompConfig, JsompLogger, JsompFlattener, JsompEventBus} from './types';

/**
 * JSOMP Runtime Context
 * Holds the current configuration and dependencies
 */
export class JsompContext {
  public logger!: JsompLogger;
  public flattener!: JsompFlattener;
  public eventBus?: JsompEventBus;

  /**
   * Initialize context with configuration
   */
  public async init(config: JsompConfig): Promise<void> {
    // 1. Logger (Fallback to console)
    if (config.logger) {
      this.logger = config.logger;
    } else {
      const {DefaultLogger} = await import('./uniform/DefaultLogger');
      this.logger = new DefaultLogger();
    }

    // 2. Flattener (Core algorithm, MUST provide or use default)
    if (config.flattener) {
      this.flattener = config.flattener;
    } else {
      const {DefaultFlattener} = await import('./uniform/DefaultFlattener');
      this.flattener = new DefaultFlattener();
    }

    // 3. EventBus (Optional, fallback to DefaultEventBus)
    if (config.eventBus) {
      this.eventBus = config.eventBus;
    } else {
      const {DefaultEventBus} = await import('./uniform/DefaultEventBus');
      this.eventBus = new DefaultEventBus();
    }

    this.logger.info('JSOMP Context Initialized.');
  }
}

// Global internal context singleton (scoped to this module)
export const internalContext = new JsompContext();
