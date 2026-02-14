import {JsompConfig} from './types';
import {internalContext} from './context';
import {JsompService} from './impl/JsompService';

/**
 * Initialize JSOMP with optional configuration
 * This is the only place where cross-module side effects should occur.
 */
export const setup = async (config: JsompConfig = {}): Promise<void> => {
  await internalContext.init(config);
};

// Export the context for internal use (should be treated as read-only by business logic)
export {internalContext as context};

/**
 * Default unique service instance
 */
export const jsomp = new JsompService();