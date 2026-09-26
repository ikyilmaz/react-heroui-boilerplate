import type { StatusStore } from '../types/StatusStore'

export function createStatusStore(): StatusStore {
  let message = ''
  const listeners = new Set<() => void>()
  return {
    get: () => message,
    set: (next) => {
      if (next === message) return
      message = next
      listeners.forEach((l) => l())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
