import { useMemo } from 'react'
import { moveFocusWithinRow } from '../functions/moveFocusWithinRow'
import type { FilterCellHandlers } from '../types/FilterCellHandlers'
import type { FilterOperation } from '../types/FilterOperation'
import type { GridColumn } from '../types/GridColumn'

/**
 * Per-column filter handlers, built once per column set. A new function on every render would
 * defeat the filter cells' memo.
 */
export function useFilterCellHandlers<TRow>(
  columns: GridColumn<TRow>[],
  setFilterValue: (name: string, value: unknown) => void,
  setFilterOperation: (name: string, operation: FilterOperation | undefined) => void,
  resetFilter: (name: string) => void,
): Record<string, FilterCellHandlers> {
  return useMemo(
    () =>
      Object.fromEntries(
        columns.map((c): [string, FilterCellHandlers] => [
          c.name,
          {
            onValueChange: (value) => setFilterValue(c.name, value),
            onOperationChange: (operation) => setFilterOperation(c.name, operation),
            onReset: () => resetFilter(c.name),
            // Escape clears the value, Tab stays in the filter row
            onKeyDown: (e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                setFilterValue(c.name, undefined)
              } else moveFocusWithinRow(e)
            },
          },
        ]),
      ),
    [columns, resetFilter, setFilterOperation, setFilterValue],
  )
}
