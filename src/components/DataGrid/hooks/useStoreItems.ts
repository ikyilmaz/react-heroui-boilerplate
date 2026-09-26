import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { ArrayStore } from '../data/ArrayStore'
import { normalizeLoadResult } from '../data/functions/normalizeLoadResult'
import type { Store } from '../data/types/Store'
import { useLatestRef } from './useLatestRef'
import { usePendingPromises } from './usePendingPromises'

const EMPTY: readonly never[] = []

/**
 * All items of the store, for local data processing. An `ArrayStore` is read synchronously and
 * followed through its `modified` event; any other store is loaded once (and again on
 * `reload()` or `modified`), as DevExtreme loads everything when operations are local.
 */
export function useStoreItems<TRow extends object>(
  store: Store<TRow>,
  enabled: boolean,
  onError: (error: Error) => void,
) {
  const arrayStore = store instanceof ArrayStore ? store : null
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!arrayStore) return () => {}
      arrayStore.on('modified', onChange)
      return () => arrayStore.off('modified', onChange)
    },
    [arrayStore],
  )
  const arrayItems = useSyncExternalStore(subscribe, () => arrayStore?.items() ?? EMPTY)

  const [version, setVersion] = useState(0)
  /** Identifies one load; "loading" means the last result belongs to another one. */
  const request = useMemo(() => ({ store, enabled, version }), [store, enabled, version])
  const [loaded, setLoaded] = useState<{ items: readonly TRow[]; request: object | null }>({
    items: EMPTY,
    request: null,
  })
  const errorRef = useLatestRef(onError)
  const pending = usePendingPromises()

  useEffect(() => {
    if (arrayStore || !request.enabled) return
    let alive = true
    request.store
      .load({})
      .then((result) => alive && setLoaded({ items: normalizeLoadResult(result).data, request }))
      .catch((error: Error) => {
        if (!alive) return
        setLoaded((l) => ({ ...l, request }))
        errorRef.current(error)
      })
      .finally(() => alive && pending.resolveAll())
    const onModified = () => setVersion((v) => v + 1)
    request.store.on('modified', onModified)
    return () => {
      alive = false
      request.store.off('modified', onModified)
    }
  }, [arrayStore, errorRef, pending, request])

  const reload = useCallback(() => {
    if (arrayStore || !enabled) return Promise.resolve()
    setVersion((v) => v + 1)
    return pending.wait()
  }, [arrayStore, enabled, pending])

  if (arrayStore) return { items: arrayItems, loading: false, reload }
  return { items: loaded.items, loading: enabled && loaded.request !== request, reload }
}
