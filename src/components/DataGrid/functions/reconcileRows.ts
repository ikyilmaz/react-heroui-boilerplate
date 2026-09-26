import type { RowCache } from '../types/RowCache'
import type { RowObject } from '../types/RowObject'
import { isSameRow } from './isSameRow'

/** Swaps unchanged rows for their previous objects; returns `cache` itself when nothing changed. */
export function reconcileRows<TRow>(cache: RowCache<TRow>, rows: RowObject<TRow>[]): RowCache<TRow> {
  const byKey = new Map<RowObject<TRow>['key'], RowObject<TRow>>()
  const list = rows.map((row) => {
    const before = cache.byKey.get(row.key)
    const stable = before && isSameRow(before, row) ? before : row
    byKey.set(row.key, stable)
    return stable
  })
  const unchanged = list.length === cache.list.length && list.every((row, i) => row === cache.list[i])
  return unchanged ? cache : { list, byKey }
}
