import type { RowKey } from '../../data/types/RowKey'
import type { GridColumn } from '../GridColumn'
import type { Cancelable } from './Cancelable'
import type { EventInfo } from './EventInfo'

export interface EditingStartEvent<TRow> extends EventInfo<TRow>, Cancelable {
  data: TRow
  key: RowKey
  /** `'cell'` mode: the edited column. */
  column?: GridColumn<TRow>
}
