import type { RowKey } from '../data/types/RowKey'

/** A visible row, like DevExtreme's `Row` object. */
export interface RowObject<TRow> {
  rowType: 'data'
  key: RowKey
  /** The row's data with pending changes applied. */
  data: TRow
  /** The stored data, without pending changes. */
  oldData?: TRow
  /** Index among the visible rows of the page. */
  rowIndex: number
  isNewRow: boolean
  /** The row is in edit mode (`editing.mode: 'row'`) or has the edited cell. */
  isEditing: boolean
  isSelected: boolean
  /** Has pending changes. */
  modified: boolean
}
