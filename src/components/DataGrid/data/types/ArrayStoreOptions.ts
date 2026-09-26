import type { DataChange } from './DataChange'
import type { RowKey } from './RowKey'

export interface ArrayStoreOptions<TRow> {
  /** Key field. Inserted items without one get a generated GUID. */
  key?: string
  data?: TRow[]
  onInserted?: (values: TRow, key: RowKey) => void
  onUpdated?: (key: RowKey, values: Partial<TRow>) => void
  onRemoved?: (key: RowKey) => void
  onModified?: () => void
  onPush?: (changes: DataChange<TRow>[]) => void
}
