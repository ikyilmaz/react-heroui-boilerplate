import type { DataChange } from '../../data/types/DataChange'
import type { Cancelable } from './Cancelable'
import type { EventInfo } from './EventInfo'

export interface EditCancelingEvent<TRow> extends EventInfo<TRow>, Cancelable {
  changes: DataChange<TRow>[]
}
