import { compileGetter } from './functions/compileGetter'
import { compileSetter } from './functions/compileSetter'
import { generateKey } from './functions/generateKey'
import { mergeValues } from './functions/mergeValues'
import { queryByOptions } from './functions/queryByOptions'
import { StoreEventEmitter } from './StoreEventEmitter'
import type { ArrayStoreOptions } from './types/ArrayStoreOptions'
import type { DataChange } from './types/DataChange'
import type { LoadOptions } from './types/LoadOptions'
import type { LoadResult } from './types/LoadResult'
import type { RowKey } from './types/RowKey'
import type { Store } from './types/Store'

/**
 * In-memory store, like DevExtreme's `ArrayStore`. One difference: the array passed in is never
 * mutated. Every change produces a new array (`items()`), which lets React see it; the grid
 * subscribes to `modified` and re-renders on its own.
 */
export class ArrayStore<TRow extends object> extends StoreEventEmitter implements Store<TRow> {
  #items: TRow[]
  readonly #key?: string
  readonly #options: ArrayStoreOptions<TRow>

  constructor(options: ArrayStoreOptions<TRow> | TRow[] = {}) {
    super()
    this.#options = Array.isArray(options) ? { data: options } : options
    this.#key = this.#options.key
    this.#items = [...(this.#options.data ?? [])]
  }

  key(): string | undefined {
    return this.#key
  }

  keyOf(item: TRow): RowKey | undefined {
    if (!this.#key) return undefined
    return compileGetter<TRow>(this.#key)(item) as RowKey | undefined
  }

  /** Immutable snapshot of the current items; a new array after every change. */
  items(): readonly TRow[] {
    return this.#items
  }

  load(options?: LoadOptions<TRow>): Promise<LoadResult<TRow>> {
    this.emit('loading', options)
    const result = queryByOptions(this.#items, options)
    this.emit('loaded', result)
    return Promise.resolve(options?.requireTotalCount ? result : result.data)
  }

  totalCount(options?: LoadOptions<TRow>): Promise<number> {
    return Promise.resolve(queryByOptions(this.#items, { filter: options?.filter }).totalCount)
  }

  byKey(key: RowKey): Promise<TRow | undefined> {
    return Promise.resolve(this.#find(key))
  }

  insert(values: Partial<TRow>): Promise<TRow> {
    const item = { ...values } as TRow
    let key = this.keyOf(item)
    if (this.#key && (key === undefined || key === null || key === '')) {
      key = generateKey()
      compileSetter(this.#key)(item, key)
    }
    if (key !== undefined && this.#find(key))
      return Promise.reject(new Error(`E4008: an item with the key "${key}" already exists`))
    this.emit('modifying')
    this.emit('inserting', values)
    this.#items = [...this.#items, item]
    this.#options.onInserted?.(item, key as RowKey)
    this.emit('inserted', item, key)
    this.#modified()
    return Promise.resolve(item)
  }

  update(key: RowKey, values: Partial<TRow>): Promise<TRow> {
    const index = this.#indexOf(key)
    if (index < 0) return Promise.reject(new Error(`E4009: no item with the key "${key}"`))
    this.emit('modifying')
    this.emit('updating', key, values)
    const next = mergeValues(this.#items[index], values)
    this.#items = this.#items.with(index, next)
    this.#options.onUpdated?.(key, values)
    this.emit('updated', key, values)
    this.#modified()
    return Promise.resolve(next)
  }

  remove(key: RowKey): Promise<void> {
    const index = this.#indexOf(key)
    if (index < 0) return Promise.resolve()
    this.emit('modifying')
    this.emit('removing', key)
    this.#items = this.#items.toSpliced(index, 1)
    this.#options.onRemoved?.(key)
    this.emit('removed', key)
    this.#modified()
    return Promise.resolve()
  }

  /** Applies changes synchronously without per-item events. */
  push(changes: DataChange<TRow>[]): void {
    let items = this.#items
    for (const change of changes) {
      const index = items.findIndex((i) => this.keyOf(i) === change.key)
      if (change.type === 'insert' && index < 0) items = [...items, change.data as TRow]
      else if (change.type === 'update' && index >= 0)
        items = items.with(index, mergeValues(items[index], change.data ?? {}))
      else if (change.type === 'remove' && index >= 0) items = items.toSpliced(index, 1)
    }
    this.#items = items
    this.#options.onPush?.(changes)
    this.emit('push', changes)
    this.#modified()
  }

  /** Replaces all items. */
  clear(): void {
    this.#items = []
    this.#modified()
  }

  #indexOf(key: RowKey): number {
    return this.#items.findIndex((i) => this.keyOf(i) === key)
  }

  #find(key: RowKey): TRow | undefined {
    return this.#items[this.#indexOf(key)]
  }

  #modified(): void {
    this.#options.onModified?.()
    this.emit('modified')
  }
}
