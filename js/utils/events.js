/** @typedef {(payload?: any) => void} EventHandler */

export class EventBus {
  #events = new Map();

  on(eventName, handler) {
    if (typeof handler !== 'function') return () => {};
    const handlers = this.#events.get(eventName) ?? new Set();
    handlers.add(handler);
    this.#events.set(eventName, handlers);
    return () => this.off(eventName, handler);
  }

  off(eventName, handler) {
    const handlers = this.#events.get(eventName);
    if (!handlers) return;
    handlers.delete(handler);
    if (!handlers.size) this.#events.delete(eventName);
  }

  once(eventName, handler) {
    let unsubscribe = () => {};
    const wrapped = (payload) => {
      unsubscribe();
      handler(payload);
    };
    unsubscribe = this.on(eventName, wrapped);
    return unsubscribe;
  }

  emit(eventName, payload) {
    const handlers = this.#events.get(eventName);
    if (!handlers) return;
    [...handlers].forEach((handler) => handler(payload));
  }
}

export const eventBus = new EventBus();
