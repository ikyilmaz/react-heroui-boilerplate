import type { RowKey } from '../../data/types/RowKey'
import type { DataGridInstance } from '../DataGridInstance'
import type { GridColumn } from '../GridColumn'
import type { RowObject } from '../RowObject'

/** What `cellRender` receives (DevExtreme's cell template data). */
export interface ColumnCellTemplateData<TRow> {
  data: TRow
  key: RowKey
  value: unknown
  displayValue: unknown
  /** Formatted text (format + customizeText). */
  text: string
  rowIndex: number
  columnIndex: number
  column: GridColumn<TRow>
  row: RowObject<TRow>
  rowType: 'data'
  component: DataGridInstance<TRow>
}
