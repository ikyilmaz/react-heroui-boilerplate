import type { Cancelable } from './Cancelable'
import type { EventInfo } from './EventInfo'

export interface RowInsertingEvent<TRow> extends EventInfo<TRow>, Cancelable {
  data: Partial<TRow>
}
