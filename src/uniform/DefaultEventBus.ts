import {JsompEventBus} from '../types';
import {TypedEmitter} from '../utils/TypedEmitter';
import {JsompEventMap} from '../events';

/**
 * Default internal event bus implementation.
 * Provides a lightweight pub/sub mechanism for JSOMP lifecycle and interaction events.
 */
/**
 * Default internal event bus implementation.
 * Provides a lightweight pub/sub mechanism for JSOMP lifecycle and interaction events.
 */
export class DefaultEventBus extends TypedEmitter<JsompEventMap> implements JsompEventBus {
  /**
   * Implementation compatible with both TypedEmitter (generic) and JsompEventBus (string).
   */
  public override on<K extends keyof JsompEventMap>(
    event: K | string,
    handler: (payload: any) => void
  ): () => void {
    return super.on(event as any, handler);
  }

  /**
   * Implementation compatible with both TypedEmitter (generic) and JsompEventBus (string).
   */
  public override emit<K extends keyof JsompEventMap>(
    event: K | string,
    payload: any
  ): void {
    super.emit(event as any, payload);
  }
}
