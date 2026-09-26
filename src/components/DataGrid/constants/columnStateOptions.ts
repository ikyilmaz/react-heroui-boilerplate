import type { ColumnState } from '../types/ColumnState'

/** Column options that live in the grid's state once it is running. */
export const COLUMN_STATE_OPTIONS: (keyof ColumnState)[] = [
  'sortOrder',
  'sortIndex',
  'filterValue',
  'selectedFilterOperation',
  'visible',
  'visibleIndex',
]
