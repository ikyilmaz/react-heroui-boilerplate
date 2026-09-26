import type { LoadOptions } from './LoadOptions'
import type { LoadResult } from './LoadResult'
import type { RowKey } from './RowKey'

type MaybePromise<T> = T | Promise<T>

export interface CustomStoreOptions<TRow> {
  key?: string
  /**
   * `'processed'` (default): `load` receives the operations listed in the grid's
   * `remoteOperations` and returns processed data. `'raw'`: `load` returns every item and the
   * store applies the load options itself.
   */
  loadMode?: 'processed' | 'raw'
  load: (options: LoadOptions<TRow>) => MaybePromise<LoadResult<TRow>>
  byKey?: (key: RowKey) => MaybePromise<TRow | undefined>
  insert?: (values: Partial<TRow>) => MaybePromise<TRow>
  update?: (key: RowKey, values: Partial<TRow>) => MaybePromise<TRow | void>
  remove?: (key: RowKey) => MaybePromise<void>
  onModified?: () => void
}
