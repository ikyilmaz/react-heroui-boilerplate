import type { RowKey } from '../../data/types/RowKey'
import type { Cancelable } from './Cancelable'
import type { EventInfo } from './EventInfo'

export interface RowRemovingEvent<TRow> extends EventInfo<TRow>, Cancelable {
  data: TRow
  key: RowKey
}
