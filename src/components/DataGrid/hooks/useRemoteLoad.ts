import { useCallback, useEffect, useMemo, useState } from 'react'
import { normalizeLoadResult } from '../data/functions/normalizeLoadResult'
import type { LoadOptions } from '../data/types/LoadOptions'
import type { Store } from '../data/types/Store'
import { useLatestRef } from './useLatestRef'
import { usePendingPromises } from './usePendingPromises'

/** Loads one processed page from the store whenever the load options change. */
export function useRemoteLoad<TRow extends object>(
  store: Store<TRow>,
  loadOptions: LoadOptions<TRow>,
  enabled: boolean,
  onError: (error: Error) => void,
  onLoaded: (data: TRow[]) => void,
) {
  const [version, setVersion] = useState(0)
  /** Identifies one load; "loading" means the last result belongs to another one. */
  const request = useMemo(() => ({ store, loadOptions, enabled, version }), [store, loadOptions, enabled, version])
  const [result, setResult] = useState<{ data: TRow[]; totalCount?: number; request: object | null }>({
    data: [],
    request: null,
  })
  const callbacks = useLatestRef({ onError, onLoaded })
  const pending = usePendingPromises()

  useEffect(() => {
    if (!request.enabled) return
    let alive = true
    request.store
      .load(request.loadOptions)
      .then((loaded) => {
        if (!alive) return
        const normalized = normalizeLoadResult(loaded)
        setResult({ ...normalized, request })
        callbacks.current.onLoaded(normalized.data)
      })
      .catch((error: Error) => {
        if (!alive) return
        setResult((r) => ({ ...r, request }))
        callbacks.current.onError(error)
      })
      .finally(() => alive && pending.resolveAll())
    const onModified = () => setVersion((v) => v + 1)
    request.store.on('modified', onModified)
    return () => {
      alive = false
      request.store.off('modified', onModified)
    }
  }, [callbacks, pending, request])

  const reload = useCallback(() => {
    if (!enabled) return Promise.resolve()
    setVersion((v) => v + 1)
    return pending.wait()
  }, [enabled, pending])

  return { data: result.data, totalCount: result.totalCount, loading: enabled && result.request !== request, reload }
}
