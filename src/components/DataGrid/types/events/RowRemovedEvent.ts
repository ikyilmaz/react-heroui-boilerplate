import type { RowKey } from '../../data/types/RowKey'
import type { EventInfo } from './EventInfo'

export interface RowRemovedEvent<TRow> extends EventInfo<TRow> {
  data: TRow
  key: RowKey
}
