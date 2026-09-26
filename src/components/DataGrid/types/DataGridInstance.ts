import type { FilterExpression } from '../data/types/FilterExpression'
import type { RowKey } from '../data/types/RowKey'
import type { Store } from '../data/types/Store'
import type { ColumnState } from './ColumnState'
import type { FilterType } from './FilterType'
import type { GridColumn } from './GridColumn'
import type { RowObject } from './RowObject'

/** The grid's methods, named as in DevExtreme: `ref.current.instance().addRow()`. */
export interface DataGridInstance<TRow> {
  // Editing
  addRow(): Promise<void>
  editRow(rowIndex: number): Promise<void>
  editCell(rowIndex: number, dataFieldOrName: string): Promise<void>
  closeEditCell(): Promise<void>
  saveEditData(): Promise<void>
  cancelEditData(): Promise<void>
  deleteRow(rowIndex: number): Promise<void>
  /** Gets the (edited) value, or sets it as a pending change. */
  cellValue(rowIndex: number, dataFieldOrName: string): unknown
  cellValue(rowIndex: number, dataFieldOrName: string, value: unknown): void
  hasEditData(): boolean

  // Rows
  getVisibleRows(): RowObject<TRow>[]
  getRowIndexByKey(key: RowKey): number
  getKeyByRowIndex(rowIndex: number): RowKey | undefined
  keyOf(rowData: TRow): RowKey | undefined
  byKey(key: RowKey): Promise<TRow | undefined>

  // Selection
  getSelectedRowKeys(): RowKey[]
  getSelectedRowsData(): TRow[]
  selectRows(keys: RowKey[], preserve: boolean): void
  deselectRows(keys: RowKey[]): void
  selectRowsByIndexes(indexes: number[]): void
  selectAll(): void
  deselectAll(): void
  clearSelection(): void
  isRowSelected(key: RowKey): boolean

  // Filtering, searching, sorting
  /** Gets or sets the data source filter. */
  filter(): FilterExpression | undefined
  filter(filterExpr: FilterExpression | undefined): void
  getCombinedFilter(): FilterExpression | undefined
  clearFilter(filterType?: FilterType): void
  searchByText(text: string): void
  clearSorting(): void

  // Columns
  columnCount(): number
  getVisibleColumns(): GridColumn<TRow>[]
  columnOption(id: number | string): (GridColumn<TRow> & ColumnState) | undefined
  columnOption(id: number | string, optionName: string): unknown
  columnOption(id: number | string, optionName: string, value: unknown): void
  columnOption(id: number | string, options: Partial<ColumnState>): void

  // Paging
  pageIndex(): number
  pageIndex(newIndex: number): void
  pageSize(): number
  pageSize(value: number): void
  pageCount(): number
  totalCount(): number

  // Data
  refresh(): Promise<void>
  getDataSource(): { store(): Store<TRow>; items(): TRow[]; totalCount(): number }
}
