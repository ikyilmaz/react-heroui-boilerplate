import { combineFilters } from '../data/functions/combineFilters'
import type { FilterExpression } from '../data/types/FilterExpression'
import type { ColumnState } from '../types/ColumnState'
import type { GridColumn } from '../types/GridColumn'

/** Every filtered column's `calculateFilterExpression(filterValue, operation, 'filterRow')`, joined with `and`. */
export function getFilterRowExpression<TRow>(
  columns: GridColumn<TRow>[],
  states: Record<string, ColumnState>,
): FilterExpression | undefined {
  return combineFilters(
    columns
      .filter((c) => !c.type && c.allowFiltering)
      .map((c) => {
        const state = states[c.name]
        return c.calculateFilterExpression(
          state?.filterValue,
          state?.selectedFilterOperation,
          'filterRow',
        )
      }),
  )
}
