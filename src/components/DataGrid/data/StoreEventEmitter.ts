import type { StoreEventName } from './types/StoreEventName'

type Handler = (...args: never[]) => void

/** Event plumbing shared by the stores (`on` / `off`). */
export class StoreEventEmitter {
  #handlers = new Map<StoreEventName, Set<Handler>>()

  on(eventName: StoreEventName, handler: Handler): this {
    let set = this.#handlers.get(eventName)
    if (!set) this.#handlers.set(eventName, (set = new Set()))
    set.add(handler)
    return this
  }

  off(eventName: StoreEventName, handler: Handler): this {
    this.#handlers.get(eventName)?.delete(handler)
    return this
  }

  protected emit(eventName: StoreEventName, ...args: unknown[]): void {
    this.#handlers.get(eventName)?.forEach((h) => (h as (...a: unknown[]) => void)(...args))
  }
}
