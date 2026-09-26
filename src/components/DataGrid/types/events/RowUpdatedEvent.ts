import type { RowKey } from '../../data/types/RowKey'
import type { EventInfo } from './EventInfo'

export interface RowUpdatedEvent<TRow> extends EventInfo<TRow> {
  /** The changed fields. */
  data: Partial<TRow>
  key: RowKey
}
