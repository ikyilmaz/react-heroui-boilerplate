import { useState } from 'react'
import { reconcileRows } from '../functions/reconcileRows'
import type { RowCache } from '../types/RowCache'
import type { RowObject } from '../types/RowObject'

/**
 * Row objects are rebuilt on every change; unchanged ones are swapped for the previous objects so
 * the memoized rows skip rendering.
 */
export function useStableRows<TRow>(rows: RowObject<TRow>[]): RowObject<TRow>[] {
  const [cache, setCache] = useState<RowCache<TRow>>(() => ({ list: [], byKey: new Map() }))
  const next = reconcileRows(cache, rows)
  if (next !== cache) setCache(next)
  return next.list
}
