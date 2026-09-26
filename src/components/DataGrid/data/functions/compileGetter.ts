import type { Selector } from '../types/Selector'

const cache = new Map<string, (item: unknown) => unknown>()

/** `'a.b.c'` → `item => item?.a?.b?.c`; functions are returned as they are. */
export function compileGetter<TRow>(selector: Selector<TRow>): (item: TRow) => unknown {
  if (typeof selector === 'function') return selector
  let getter = cache.get(selector)
  if (!getter) {
    const path = selector.split('.')
    getter =
      path.length === 1
        ? (item) => (item as Record<string, unknown> | null | undefined)?.[selector]
        : (item) => {
            let current = item as Record<string, unknown> | null | undefined
            for (const part of path) {
              if (current == null) return undefined
              current = current[part] as Record<string, unknown> | null | undefined
            }
            return current
          }
    cache.set(selector, getter)
  }
  return getter
}
