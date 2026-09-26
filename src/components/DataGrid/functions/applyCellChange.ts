import { mergeValues } from '../data/functions/mergeValues'
import type { DataChange } from '../data/types/DataChange'
import type { RowKey } from '../data/types/RowKey'

/** Merges `newData` into the row's pending change, creating an `update` change when there is none. */
export function applyCellChange<TRow>(
  changes: DataChange<TRow>[],
  key: RowKey,
  newData: Partial<TRow>,
): DataChange<TRow>[] {
  const index = changes.findIndex((c) => c.key === key)
  if (index < 0) return [...changes, { type: 'update', key, data: newData }]
  const change = changes[index]
  return changes.with(index, { ...change, data: mergeValues(change.data ?? {}, newData) })
}
