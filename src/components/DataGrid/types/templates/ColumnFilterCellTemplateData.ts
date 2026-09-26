import type { DataGridInstance } from '../DataGridInstance'
import type { FilterOperation } from '../FilterOperation'
import type { GridColumn } from '../GridColumn'
import type { KeyHandler } from '../KeyHandler'
import type { OperationOption } from '../OperationOption'

/** Not in DevExtreme: what `filterCellRender` receives. Return an element if you need hooks. */
export interface ColumnFilterCellTemplateData<TRow> {
  column: GridColumn<TRow>
  filterValue: unknown
  selectedFilterOperation: FilterOperation | undefined
  setFilterValue: (value: unknown) => void
  setSelectedFilterOperation: (operation: FilterOperation | undefined) => void
  operations: OperationOption[]
  /** Escape resets, Tab stays in the filter row. */
  onKeyDown: KeyHandler
  updateValueTimeout: number
  component: DataGridInstance<TRow>
}
