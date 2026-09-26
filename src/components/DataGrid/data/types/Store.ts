import type { DataChange } from './DataChange'
import type { LoadOptions } from './LoadOptions'
import type { LoadResult } from './LoadResult'
import type { RowKey } from './RowKey'
import type { StoreEventName } from './StoreEventName'

/** The part of DevExtreme's `Store` API the grid relies on. */
export interface Store<TRow> {
  key(): string | undefined
  keyOf(item: TRow): RowKey | undefined
  load(options?: LoadOptions<TRow>): Promise<LoadResult<TRow>>
  byKey(key: RowKey): Promise<TRow | undefined>
  insert(values: Partial<TRow>): Promise<TRow>
  update(key: RowKey, values: Partial<TRow>): Promise<TRow>
  remove(key: RowKey): Promise<void>
  push(changes: DataChange<TRow>[]): void
  on(eventName: StoreEventName, handler: (...args: never[]) => void): this
  off(eventName: StoreEventName, handler: (...args: never[]) => void): this
}
