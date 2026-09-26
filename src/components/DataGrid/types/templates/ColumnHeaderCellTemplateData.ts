import type { DataGridInstance } from '../DataGridInstance'
import type { GridColumn } from '../GridColumn'

export interface ColumnHeaderCellTemplateData<TRow> {
  column: GridColumn<TRow>
  columnIndex: number
  component: DataGridInstance<TRow>
}
