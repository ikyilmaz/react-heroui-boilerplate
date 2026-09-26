import type { RowKey } from '../../data/types/RowKey'
import type { EventInfo } from './EventInfo'

export interface SelectionChangedEvent<TRow> extends EventInfo<TRow> {
  selectedRowKeys: RowKey[]
  selectedRowsData: TRow[]
  currentSelectedRowKeys: RowKey[]
  currentDeselectedRowKeys: RowKey[]
}
