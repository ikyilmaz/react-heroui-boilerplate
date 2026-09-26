import type { RowObject } from '../types/RowObject'

/** Row objects are rebuilt every time; equal ones are swapped for the previous object. */
export function isSameRow<TRow>(a: RowObject<TRow>, b: RowObject<TRow>): boolean {
  return (
    a.key === b.key &&
    a.data === b.data &&
    a.oldData === b.oldData &&
    a.rowIndex === b.rowIndex &&
    a.isNewRow === b.isNewRow &&
    a.isEditing === b.isEditing &&
    a.isSelected === b.isSelected &&
    a.modified === b.modified
  )
}
