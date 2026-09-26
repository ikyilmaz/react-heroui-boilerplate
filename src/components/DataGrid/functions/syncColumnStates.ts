import { COLUMN_STATE_OPTIONS } from '../constants/columnStateOptions'
import type { ColumnState } from '../types/ColumnState'
import type { GridColumn } from '../types/GridColumn'
import { getInitialColumnState } from './getInitialColumnState'

/**
 * After the `columns` prop changed: new columns start from their props, and an option whose prop
 * value changed takes the new value (the prop wins, as in DevExtreme). Untouched options keep
 * what the user did.
 */
export function syncColumnStates<TRow>(
  states: Record<string, ColumnState>,
  previous: GridColumn<TRow>[],
  next: GridColumn<TRow>[],
): Record<string, ColumnState> {
  const result: Record<string, ColumnState> = {}
  for (const column of next) {
    const before = previous.find((c) => c.name === column.name)
    const state = states[column.name]
    if (!before || !state) {
      result[column.name] = getInitialColumnState(column)
      continue
    }
    const initial = getInitialColumnState(column)
    const initialBefore = getInitialColumnState(before)
    let merged = state
    for (const option of COLUMN_STATE_OPTIONS)
      if (initial[option] !== initialBefore[option]) merged = { ...merged, [option]: initial[option] }
    result[column.name] = merged
  }
  return result
}
