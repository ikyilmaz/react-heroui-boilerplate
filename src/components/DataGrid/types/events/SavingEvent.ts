import type { DataChange } from '../../data/types/DataChange'
import type { Cancelable } from './Cancelable'
import type { EventInfo } from './EventInfo'

export interface SavingEvent<TRow> extends EventInfo<TRow>, Cancelable {
  /** May be edited; the edited list is what gets saved. */
  changes: DataChange<TRow>[]
  /** Resolve after doing the saving yourself (set `cancel` too, or the grid saves as well). */
  promise?: Promise<void>
}
