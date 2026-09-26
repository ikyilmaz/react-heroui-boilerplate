import type { SortDescriptor } from '../data/types/SortDescriptor'
import type { ColumnState } from '../types/ColumnState'
import type { GridColumn } from '../types/GridColumn'

/**
 * The sort of the columns with a `sortOrder`, in `sortIndex` order. Locally, lookup columns sort
 * by display text; for a remote store only field selectors are sent.
 */
export function getSortDescriptors<TRow>(
  columns: GridColumn<TRow>[],
  states: Record<string, ColumnState>,
  remote: boolean,
): SortDescriptor<TRow>[] {
  return columns
    .filter((c) => states[c.name]?.sortOrder)
    .map((c, order) => ({ c, order, index: states[c.name].sortIndex }))
    .sort((a, b) => (a.index ?? Infinity) - (b.index ?? Infinity) || a.order - b.order)
    .map(({ c }) => {
      const { calculateSortValue, lookup } = c
      let selector: SortDescriptor<TRow>['selector'] = c.selector
      if (calculateSortValue) selector = calculateSortValue
      else if (lookup && !remote) selector = (row: TRow) => lookup.calculateCellValue(c.calculateCellValue(row))
      return {
        selector,
        desc: states[c.name].sortOrder === 'desc',
        compare: c.sortingMethod?.bind(c),
      }
    })
}
