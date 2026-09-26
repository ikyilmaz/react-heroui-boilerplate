import { useCallback, useMemo, useRef } from 'react'

/**
 * Promises resolved when the next load finishes (`refresh()` waits for it). The returned object is
 * stable: load effects list it as a dependency, and a new object per render re-ran them — each
 * render started another `load()`.
 */
export function usePendingPromises() {
  const resolvers = useRef<(() => void)[]>([])
  const wait = useCallback(() => new Promise<void>((resolve) => resolvers.current.push(resolve)), [])
  const resolveAll = useCallback(() => {
    const list = resolvers.current
    resolvers.current = []
    list.forEach((resolve) => resolve())
  }, [])
  return useMemo(() => ({ wait, resolveAll }), [resolveAll, wait])
}
