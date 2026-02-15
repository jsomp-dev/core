
import {JsompLogger} from '../types';

/**
 * Default Logger implementation using native console
 */
export class DefaultLogger implements JsompLogger {
  info(msg: string, ...args: any[]): void {
    console.info(`[JSOMP] ${msg}`, ...args);
  }

  warn(msg: string, ...args: any[]): void {
    console.warn(`[JSOMP] ${msg}`, ...args);
  }

  error(msg: string, ...args: any[]): void {
    console.error(`[JSOMP] ${msg}`, ...args);
  }

  debug(msg: string, ...args: any[]): void {
    console.debug(`[JSOMP] ${msg}`, ...args);
  }

  throw(codeOrError: any | string | number | Error, message?: string, context?: any): never {
    if (codeOrError instanceof Error) {
      throw codeOrError;
    }
    const err = new Error(`[JSOMP][${codeOrError}] ${message}`);
    (err as any).context = context;
    throw err;
  }
}
