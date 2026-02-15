/**
 * Lightweight Typed Event Emitter
 */
export class TypedEmitter<T extends Record<string, any>> {
  private listeners: Map<keyof T, Set<Function>> = new Map();

  /**
   * Subscribe to an event
   * @returns Unsubscribe function
   */
  on<K extends keyof T>(
    event: K,
    handler: (payload: T[K]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof T>(
    event: K,
    handler: (payload: T[K]) => void
  ): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }

  /**
   * Synchronously notify all subscribers
   */
  emit<K extends keyof T>(event: K, payload: T[K]): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(payload));
    }
  }

  /**
   * Clear all listeners for a specific event or all events
   */
  removeAllListeners(event?: keyof T): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }
}
