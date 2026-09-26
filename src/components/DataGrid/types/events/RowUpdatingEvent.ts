import type { RowKey } from '../../data/types/RowKey'
import type { Cancelable } from './Cancelable'
import type { EventInfo } from './EventInfo'

export interface RowUpdatingEvent<TRow> extends EventInfo<TRow>, Cancelable {
  oldData: TRow
  /** Only the changed fields; may be edited. */
  newData: Partial<TRow>
  key: RowKey
}
