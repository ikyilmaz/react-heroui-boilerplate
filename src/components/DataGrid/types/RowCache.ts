import type { RowKey } from '../data/types/RowKey'
import type { RowObject } from './RowObject'

export interface RowCache<TRow> {
  list: RowObject<TRow>[]
  byKey: Map<RowKey, RowObject<TRow>>
}
