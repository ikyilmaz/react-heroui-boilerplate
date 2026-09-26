import type { DataChange } from '../../data/types/DataChange'
import type { EventInfo } from './EventInfo'

export interface EditCanceledEvent<TRow> extends EventInfo<TRow> {
  changes: DataChange<TRow>[]
}
