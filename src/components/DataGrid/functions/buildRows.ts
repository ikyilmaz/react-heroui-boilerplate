import { mergeValues } from '../data/functions/mergeValues'
import type { DataChange } from '../data/types/DataChange'
import type { RowKey } from '../data/types/RowKey'
import type { NewRowPosition } from '../types/options/NewRowPosition'
import type { RowObject } from '../types/RowObject'
import { isNewRowFirst } from './isNewRowFirst'

/** The page's row objects, with pending changes applied and new rows placed. */
export function buildRows<TRow>({
  pageItems,
  changes,
  keyOf,
  editRowKey,
  newRowPosition,
  selectedKeys,
}: {
  pageItems: TRow[]
  changes: DataChange<TRow>[]
  keyOf: (item: TRow) => RowKey
  editRowKey: RowKey | null
  newRowPosition: NewRowPosition
  selectedKeys: ReadonlySet<RowKey>
}): RowObject<TRow>[] {
  const updates = new Map(changes.filter((c) => c.type === 'update').map((c) => [c.key, c]))
  const dataRows = pageItems.map((item) => {
    const key = keyOf(item)
    const change = updates.get(key)
    return {
      key,
      data: change ? mergeValues(item, change.data ?? {}) : item,
      oldData: item,
      isNewRow: false,
      modified: !!change,
    }
  })
  const newRows = changes
    .filter((c) => c.type === 'insert')
    .map((c) => ({ key: c.key, data: c.data as TRow, oldData: undefined, isNewRow: true, modified: true }))
  const ordered = isNewRowFirst(newRowPosition) ? [...newRows, ...dataRows] : [...dataRows, ...newRows]
  return ordered.map((r, rowIndex) => ({
    rowType: 'data',
    ...r,
    rowIndex,
    isEditing: r.key === editRowKey,
    isSelected: selectedKeys.has(r.key),
  }))
}
