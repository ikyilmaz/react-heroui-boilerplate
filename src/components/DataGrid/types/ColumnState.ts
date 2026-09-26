import type { FilterOperation } from './FilterOperation'
import type { SortOrder } from './SortOrder'

/**
 * Column options that change while the grid is used (sorting, filtering, visibility). They start
 * from the column props and are changed through `columnOption`.
 */
export interface ColumnState {
  sortOrder?: SortOrder
  sortIndex?: number
  filterValue?: unknown
  selectedFilterOperation?: FilterOperation
  /** `filterRow.applyFilter: 'onClick'`: typed but not applied yet. */
  bufferedFilterValue?: unknown
  bufferedSelectedFilterOperation?: FilterOperation
  visible?: boolean
  visibleIndex?: number
}
