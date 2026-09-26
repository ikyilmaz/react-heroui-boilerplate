import type { GridColumn } from '../GridColumn'
import type { RowObject } from '../RowObject'
import type { EventInfo } from './EventInfo'

export interface ColumnButtonClickEvent<TRow> extends EventInfo<TRow> {
  row: RowObject<TRow>
  column: GridColumn<TRow>
}
