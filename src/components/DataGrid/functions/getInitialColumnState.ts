import type { ColumnState } from '../types/ColumnState'
import type { GridColumn } from '../types/GridColumn'

export function getInitialColumnState<TRow>(column: GridColumn<TRow>): ColumnState {
  return {
    sortOrder: column.sortOrder,
    sortIndex: column.sortIndex,
    filterValue: column.filterValue,
    selectedFilterOperation: column.defaultSelectedFilterOperation,
    visible: column.visible,
    visibleIndex: column.visibleIndex,
  }
}
