import type { RowKey } from '../../data/types/RowKey'
import type { EventInfo } from './EventInfo'

export interface RowInsertedEvent<TRow> extends EventInfo<TRow> {
  data: TRow
  key: RowKey | undefined
}
